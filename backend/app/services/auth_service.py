"""Authentication use cases: login, refresh-token rotation, logout, password change."""

from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import BadRequestError, ForbiddenError, UnauthorizedError
from app.core.logging import get_logger
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.models import RefreshToken, User
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.repositories.user_repository import UserRepository
from app.schemas.user import PasswordChange, ProfileUpdate
from app.services.audit_service import AuditAction, AuditService
from app.utils.request import ClientInfo
from app.utils.time import utcnow

logger = get_logger(__name__)


def _invalid_refresh_token() -> UnauthorizedError:
    return UnauthorizedError(
        "The session has expired. Please sign in again.", code="invalid_refresh_token"
    )


@dataclass(frozen=True, slots=True)
class AuthResult:
    user: User
    access_token: str
    expires_in: int
    # Raw refresh token: goes into the httpOnly cookie only, never into a response body or log.
    refresh_token: str
    refresh_expires_at: datetime


class AuthService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.tokens = RefreshTokenRepository(session)
        self.audit = AuditService(session)

    # -- Login -------------------------------------------------------------------------
    def login(self, *, email: str, password: str, client: ClientInfo) -> AuthResult:
        user = self.users.get_by_email(email)
        password_ok = verify_password(password, user.password_hash if user else None)

        if user is None or not password_ok:
            self.audit.record(
                AuditAction.LOGIN_FAILED,
                actor_id=user.id if user else None,
                metadata={"email": email, "reason": "invalid_credentials"},
                client=client,
            )
            self.session.commit()
            raise UnauthorizedError("Invalid email or password.", code="invalid_credentials")

        if not user.is_active:
            self.audit.record(
                AuditAction.LOGIN_FAILED,
                actor_id=user.id,
                metadata={"email": email, "reason": "inactive_user"},
                client=client,
            )
            self.session.commit()
            raise ForbiddenError("This account is disabled.", code="inactive_user")

        result = self._issue_tokens(user, client)
        self.audit.record(
            AuditAction.LOGIN_SUCCEEDED,
            actor_id=user.id,
            resource_type="user",
            resource_id=user.id,
            client=client,
        )
        self.session.commit()
        return result

    # -- Refresh (rotation with reuse detection) ---------------------------------------
    def refresh(self, *, raw_token: str | None, client: ClientInfo) -> AuthResult:
        if not raw_token:
            raise _invalid_refresh_token()

        token = self.tokens.get_by_hash_for_update(hash_refresh_token(raw_token))
        now = utcnow()
        if token is None:
            raise _invalid_refresh_token()

        if token.revoked_at is not None:
            grace = timedelta(seconds=settings.refresh_token_reuse_grace_seconds)
            if now - token.revoked_at > grace:
                # A revoked token was replayed: assume theft and end every session of the user.
                revoked = self.tokens.revoke_all_for_user(token.user_id, now=now)
                self.audit.record(
                    AuditAction.REFRESH_TOKEN_REUSED,
                    actor_id=token.user_id,
                    resource_type="user",
                    resource_id=token.user_id,
                    metadata={"revoked_sessions": revoked},
                    client=client,
                )
                self.session.commit()
                logger.warning("Refresh token reuse detected", extra={"user_id": token.user_id})
            raise _invalid_refresh_token()

        if token.expires_at <= now:
            raise _invalid_refresh_token()

        user = token.user
        if not user.is_active:
            self.tokens.revoke_all_for_user(user.id, now=now)
            self.session.commit()
            raise _invalid_refresh_token()

        token.revoked_at = now  # rotate: each refresh token is single-use
        result = self._issue_tokens(user, client, now=now)
        self.session.commit()
        return result

    # -- Logout ------------------------------------------------------------------------
    def logout(self, *, raw_token: str | None, client: ClientInfo) -> None:
        """Revokes the presented refresh token. Idempotent: unknown tokens are ignored."""
        if not raw_token:
            return
        token = self.tokens.get_by_hash(hash_refresh_token(raw_token))
        if token is None or token.revoked_at is not None:
            return
        token.revoked_at = utcnow()
        self.audit.record(
            AuditAction.LOGOUT,
            actor_id=token.user_id,
            resource_type="user",
            resource_id=token.user_id,
            client=client,
        )
        self.session.commit()

    # -- Account -----------------------------------------------------------------------
    def update_profile(self, user: User, data: ProfileUpdate, *, client: ClientInfo) -> User:
        user.name = data.name
        self.audit.record(
            AuditAction.PROFILE_UPDATED,
            actor_id=user.id,
            resource_type="user",
            resource_id=user.id,
            metadata={"fields": ["name"]},
            client=client,
        )
        self.session.commit()
        return user

    def change_password(
        self,
        user: User,
        data: PasswordChange,
        *,
        current_refresh_token: str | None,
        client: ClientInfo,
    ) -> None:
        if not verify_password(data.current_password, user.password_hash):
            message = "The current password is incorrect."
            raise BadRequestError(
                message,
                details=[
                    {
                        "field": "current_password",
                        "loc": ["body", "current_password"],
                        "message": message,
                        "type": "invalid_password",
                    }
                ],
            )
        user.password_hash = hash_password(data.new_password)

        # End every other session; keep the one making this request signed in.
        keep_id: int | None = None
        if current_refresh_token:
            current = self.tokens.get_by_hash(hash_refresh_token(current_refresh_token))
            if current is not None and current.user_id == user.id:
                keep_id = current.id
        self.tokens.revoke_all_for_user(user.id, now=utcnow(), except_token_id=keep_id)

        self.audit.record(
            AuditAction.PASSWORD_CHANGED,
            actor_id=user.id,
            resource_type="user",
            resource_id=user.id,
            client=client,
        )
        self.session.commit()

    # -- Maintenance -------------------------------------------------------------------
    def purge_expired_tokens(self) -> int:
        deleted = self.tokens.delete_expired(before=utcnow())
        self.session.commit()
        return deleted

    # -- Internals ---------------------------------------------------------------------
    def _issue_tokens(
        self, user: User, client: ClientInfo, *, now: datetime | None = None
    ) -> AuthResult:
        issued_at = now or utcnow()
        raw_refresh = generate_refresh_token()
        refresh_expires_at = issued_at + timedelta(days=settings.refresh_token_expire_days)
        self.tokens.add(
            RefreshToken(
                user_id=user.id,
                token_hash=hash_refresh_token(raw_refresh),
                expires_at=refresh_expires_at,
                user_agent=client.user_agent,
                ip_address=client.ip_address,
            )
        )
        return AuthResult(
            user=user,
            access_token=create_access_token(user_id=user.id, role=user.role.name, now=issued_at),
            expires_in=settings.access_token_expire_minutes * 60,
            refresh_token=raw_refresh,
            refresh_expires_at=refresh_expires_at,
        )

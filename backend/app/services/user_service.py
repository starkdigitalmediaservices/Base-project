"""User administration use cases."""

from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestError, ConflictError, NotFoundError
from app.core.security import hash_password
from app.models import Role, User
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.repositories.role_repository import RoleRepository
from app.repositories.user_repository import UserRepository
from app.schemas.pagination import Page, PageParams
from app.schemas.user import (
    UserBulkStatusResult,
    UserBulkStatusUpdate,
    UserCreate,
    UserListQuery,
    UserRead,
    UserUpdate,
)
from app.services.audit_service import AuditAction, AuditService
from app.utils.request import ClientInfo
from app.utils.time import utcnow


def _field_error(field: str, message: str, error_type: str) -> list[dict[str, Any]]:
    return [{"field": field, "loc": ["body", field], "message": message, "type": error_type}]


def _email_taken() -> ConflictError:
    message = "A user with this email already exists."
    return ConflictError(message, details=_field_error("email", message, "duplicate"))


class UserService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.roles = RoleRepository(session)
        self.tokens = RefreshTokenRepository(session)
        self.audit = AuditService(session)

    def list_users(self, query: UserListQuery, params: PageParams) -> Page[UserRead]:
        users, total = self.users.list_page(query, params)
        return Page[UserRead].create(
            [UserRead.model_validate(user) for user in users], total=total, params=params
        )

    def get_user(self, user_id: int) -> User:
        user = self.users.get(user_id)
        if user is None:
            raise NotFoundError("User not found.")
        return user

    def create_user(self, data: UserCreate, *, actor: User, client: ClientInfo) -> User:
        role = self._get_role_or_error(data.role_id)
        if self.users.email_exists(data.email):
            raise _email_taken()

        user = User(
            name=data.name,
            email=data.email,
            password_hash=hash_password(data.password),
            is_active=data.is_active,
            role=role,
        )
        try:
            self.users.add(user)
        except IntegrityError as exc:  # concurrent insert of the same email
            self.session.rollback()
            raise _email_taken() from exc

        self.audit.record(
            AuditAction.USER_CREATED,
            actor_id=actor.id,
            resource_type="user",
            resource_id=user.id,
            metadata={"email": user.email, "role": role.name},
            client=client,
        )
        self.session.commit()
        return user

    def update_user(
        self, user_id: int, data: UserUpdate, *, actor: User, client: ClientInfo
    ) -> User:
        user = self.get_user(user_id)
        changes = data.model_dump(exclude_unset=True)

        if user.id == actor.id:
            if changes.get("is_active") is False:
                raise BadRequestError("You cannot deactivate your own account.")
            if "role_id" in changes and changes["role_id"] != user.role_id:
                raise BadRequestError("You cannot change your own role.")

        if data.email is not None and data.email != user.email:
            if self.users.email_exists(data.email, exclude_id=user.id):
                raise _email_taken()
            user.email = data.email
        if data.name is not None:
            user.name = data.name
        if data.role_id is not None and data.role_id != user.role_id:
            user.role = self._get_role_or_error(data.role_id)
        if data.is_active is not None:
            user.is_active = data.is_active
        if data.password is not None:
            user.password_hash = hash_password(data.password)

        # A deactivated user or a reset password ends all existing sessions.
        if data.is_active is False or data.password is not None:
            self.tokens.revoke_all_for_user(user.id, now=utcnow())

        try:
            self.session.flush()
        except IntegrityError as exc:
            self.session.rollback()
            raise _email_taken() from exc

        self.audit.record(
            AuditAction.USER_UPDATED,
            actor_id=actor.id,
            resource_type="user",
            resource_id=user.id,
            # Record which fields changed, never their sensitive values.
            metadata={"fields": sorted(changes)},
            client=client,
        )
        self.session.commit()
        return user

    def bulk_update_status(
        self, data: UserBulkStatusUpdate, *, actor: User, client: ClientInfo
    ) -> UserBulkStatusResult:
        """Activate or deactivate multiple users atomically.

        The actor's own account is always skipped to prevent self-lockout.
        Users already in the target state are skipped (no-op, not an error).
        """
        user_ids = list(dict.fromkeys(data.user_ids))  # deduplicate, preserve order
        updated = 0
        skipped = 0

        for user_id in user_ids:
            if user_id == actor.id:
                skipped += 1
                continue
            user = self.users.get(user_id)
            if user is None or user.is_active == data.is_active:
                skipped += 1
                continue
            user.is_active = data.is_active
            if not data.is_active:
                self.tokens.revoke_all_for_user(user.id, now=utcnow())
            self.audit.record(
                AuditAction.USER_UPDATED,
                actor_id=actor.id,
                resource_type="user",
                resource_id=user.id,
                metadata={"fields": ["is_active"], "is_active": data.is_active, "bulk": True},
                client=client,
            )
            updated += 1

        self.session.commit()
        return UserBulkStatusResult(updated=updated, skipped=skipped)

    def delete_user(self, user_id: int, *, actor: User, client: ClientInfo) -> None:
        """Permanently delete a user. The actor cannot delete themselves."""
        user = self.get_user(user_id)
        if user.id == actor.id:
            raise BadRequestError("You cannot delete your own account.")
        # Revoke all sessions before deletion so FK cascades are clean.
        self.tokens.revoke_all_for_user(user.id, now=utcnow())
        self.session.flush()
        self.audit.record(
            AuditAction.USER_DELETED,
            actor_id=actor.id,
            resource_type="user",
            resource_id=user.id,
            metadata={"email": user.email, "name": user.name},
            client=client,
        )
        self.session.delete(user)
        self.session.commit()

    def _get_role_or_error(self, role_id: int) -> Role:
        role = self.roles.get(role_id)
        if role is None:
            message = "The selected role does not exist."
            raise BadRequestError(message, details=_field_error("role_id", message, "not_found"))
        return role

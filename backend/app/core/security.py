"""Low-level security primitives: password hashing, JWT access tokens, and refresh tokens.

Business rules (who may log in, token rotation, revocation) live in `app.services.auth_service`.
"""

import hashlib
import hmac
import secrets
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from pwdlib import PasswordHash

from app.core.config import settings
from app.core.exceptions import UnauthorizedError

ACCESS_TOKEN_TYPE = "access"  # noqa: S105 - token type label, not a secret

# Argon2id with pwdlib's recommended parameters.
_password_hash = PasswordHash.recommended()

# Used to equalize login timing when the email does not exist (prevents user enumeration).
_DUMMY_PASSWORD_HASH = _password_hash.hash(secrets.token_urlsafe(16))


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    if password_hash is None:
        _password_hash.verify(password, _DUMMY_PASSWORD_HASH)
        return False
    return _password_hash.verify(password, password_hash)


@dataclass(frozen=True, slots=True)
class AccessTokenPayload:
    user_id: int
    role: str
    jti: str
    expires_at: datetime


def create_access_token(*, user_id: int, role: str, now: datetime | None = None) -> str:
    issued_at = now or datetime.now(UTC)
    expires_at = issued_at + timedelta(minutes=settings.access_token_expire_minutes)
    claims: dict[str, Any] = {
        "sub": str(user_id),
        "role": role,
        "type": ACCESS_TOKEN_TYPE,
        "iss": settings.jwt_issuer,
        "iat": issued_at,
        "nbf": issued_at,
        "exp": expires_at,
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(
        claims, settings.jwt_secret_key.get_secret_value(), algorithm=settings.jwt_algorithm
    )


def decode_access_token(token: str) -> AccessTokenPayload:
    try:
        claims = jwt.decode(
            token,
            settings.jwt_secret_key.get_secret_value(),
            algorithms=[settings.jwt_algorithm],
            issuer=settings.jwt_issuer,
            options={"require": ["exp", "iat", "sub", "type", "jti"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise UnauthorizedError("The access token has expired.", code="token_expired") from exc
    except jwt.InvalidTokenError as exc:
        raise UnauthorizedError("The access token is invalid.", code="invalid_token") from exc

    if claims.get("type") != ACCESS_TOKEN_TYPE:
        raise UnauthorizedError("The access token is invalid.", code="invalid_token")
    try:
        user_id = int(claims["sub"])
    except (TypeError, ValueError) as exc:
        raise UnauthorizedError("The access token is invalid.", code="invalid_token") from exc

    return AccessTokenPayload(
        user_id=user_id,
        role=str(claims.get("role", "")),
        jti=str(claims["jti"]),
        expires_at=datetime.fromtimestamp(claims["exp"], tz=UTC),
    )


def generate_refresh_token() -> str:
    """A high-entropy opaque token. Only its hash is ever stored."""
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    """Refresh tokens are random (not user-chosen), so a fast keyed hash is sufficient."""
    key = settings.jwt_secret_key.get_secret_value().encode()
    return hmac.new(key, token.encode(), hashlib.sha256).hexdigest()

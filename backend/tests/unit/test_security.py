from datetime import UTC, datetime, timedelta

import jwt
import pytest
from app.core.config import settings
from app.core.exceptions import UnauthorizedError
from app.core.security import (
    create_access_token,
    decode_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)


def test_password_hash_roundtrip() -> None:
    hashed = hash_password("correct horse battery")
    assert hashed != "correct horse battery"
    assert hashed.startswith("$argon2id$")
    assert verify_password("correct horse battery", hashed)
    assert not verify_password("wrong password", hashed)


def test_verify_password_without_hash_is_false() -> None:
    assert verify_password("anything", None) is False


def test_access_token_roundtrip() -> None:
    token = create_access_token(user_id=42, role="admin")
    payload = decode_access_token(token)
    assert payload.user_id == 42
    assert payload.role == "admin"
    assert payload.expires_at > datetime.now(UTC)


def test_expired_access_token_is_rejected() -> None:
    issued = datetime.now(UTC) - timedelta(minutes=settings.access_token_expire_minutes + 1)
    token = create_access_token(user_id=1, role="user", now=issued)
    with pytest.raises(UnauthorizedError) as exc:
        decode_access_token(token)
    assert exc.value.code == "token_expired"


def test_tampered_access_token_is_rejected() -> None:
    token = create_access_token(user_id=1, role="user")
    with pytest.raises(UnauthorizedError) as exc:
        decode_access_token(token[:-2] + ("AA" if not token.endswith("AA") else "BB"))
    assert exc.value.code == "invalid_token"


def test_token_signed_with_other_key_is_rejected() -> None:
    claims = {"sub": "1", "type": "access", "iat": 0, "exp": 9_999_999_999, "jti": "x"}
    forged = jwt.encode(claims, "another-secret-another-secret-123456", algorithm="HS256")
    with pytest.raises(UnauthorizedError):
        decode_access_token(forged)


def test_non_access_token_type_is_rejected() -> None:
    now = datetime.now(UTC)
    claims = {
        "sub": "1",
        "type": "refresh",
        "iss": settings.jwt_issuer,
        "iat": now,
        "exp": now + timedelta(minutes=5),
        "jti": "x",
    }
    token = jwt.encode(
        claims, settings.jwt_secret_key.get_secret_value(), algorithm=settings.jwt_algorithm
    )
    with pytest.raises(UnauthorizedError):
        decode_access_token(token)


def test_refresh_tokens_are_random_and_hashed_deterministically() -> None:
    first, second = generate_refresh_token(), generate_refresh_token()
    assert first != second
    assert len(first) >= 64
    assert hash_refresh_token(first) == hash_refresh_token(first)
    assert hash_refresh_token(first) != first
    assert len(hash_refresh_token(first)) == 64

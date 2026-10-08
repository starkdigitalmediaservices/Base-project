from datetime import timedelta

from app.core.config import settings
from app.models import AuditLog, RefreshToken, User
from app.utils.time import utcnow
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from tests.conftest import DEFAULT_PASSWORD, UserFactory, auth_headers, login

LOGIN = "/api/v1/auth/login"
REFRESH = "/api/v1/auth/refresh"
LOGOUT = "/api/v1/auth/logout"
ME = "/api/v1/auth/me"


def _use_refresh_cookie(client: TestClient, value: str | None) -> None:
    client.cookies.clear()
    client.cookies.set(settings.refresh_cookie_name, str(value))


def _tokens(db: Session, user: User) -> list[RefreshToken]:
    return list(db.scalars(select(RefreshToken).where(RefreshToken.user_id == user.id)))


def test_login_returns_access_token_and_httponly_refresh_cookie(
    client: TestClient, make_user: UserFactory, db_session: Session
) -> None:
    user = make_user(email="Login@Example.com")
    response = client.post(LOGIN, json={"email": "LOGIN@example.com", "password": DEFAULT_PASSWORD})

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == settings.access_token_expire_minutes * 60
    assert body["user"]["email"] == "login@example.com"
    assert body["user"]["role"]["name"] == "user"
    assert body["user"]["permissions"] == []
    assert "password_hash" not in body["user"]
    assert "refresh_token" not in body

    cookie = response.headers["set-cookie"]
    assert cookie.startswith(f"{settings.refresh_cookie_name}=")
    assert "HttpOnly" in cookie
    assert f"Path={settings.refresh_cookie_path}" in cookie
    assert "SameSite=lax" in cookie
    assert response.headers["cache-control"] == "no-store"

    # Only the hash is stored.
    [stored] = _tokens(db_session, user)
    raw_value = cookie.split(";")[0].split("=", 1)[1]
    assert stored.token_hash != raw_value


def test_login_with_wrong_password(client: TestClient, make_user: UserFactory) -> None:
    user = make_user()
    response = client.post(LOGIN, json={"email": user.email, "password": "wrong-password"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_credentials"
    assert response.headers["www-authenticate"] == "Bearer"


def test_login_with_unknown_email_gives_same_error(client: TestClient) -> None:
    response = client.post(LOGIN, json={"email": "ghost@example.com", "password": "whatever1"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_credentials"


def test_login_of_inactive_user_is_forbidden(client: TestClient, make_user: UserFactory) -> None:
    user = make_user(is_active=False)
    response = client.post(LOGIN, json={"email": user.email, "password": DEFAULT_PASSWORD})
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "inactive_user"


def test_login_validation_errors_are_field_level(client: TestClient) -> None:
    response = client.post(LOGIN, json={"email": "not-an-email"})
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert {d["field"] for d in error["details"]} == {"email", "password"}


def test_login_is_audited(client: TestClient, make_user: UserFactory, db_session: Session) -> None:
    user = make_user()
    client.post(LOGIN, json={"email": user.email, "password": "bad-password"})
    login(client, user.email)
    actions = list(
        db_session.scalars(select(AuditLog.action).where(AuditLog.actor_user_id == user.id))
    )
    assert sorted(actions) == ["auth.login.failed", "auth.login.succeeded"]


def test_me_requires_a_valid_token(client: TestClient) -> None:
    assert client.get(ME).json()["error"]["code"] == "unauthorized"
    response = client.get(ME, headers=auth_headers("not-a-jwt"))
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_token"


def test_me_returns_current_user_with_permissions(
    client: TestClient, admin: User, admin_headers: dict[str, str]
) -> None:
    response = client.get(ME, headers=admin_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == admin.id
    assert body["role"]["name"] == "admin"
    assert "users:write" in body["permissions"]


def test_deactivated_user_token_stops_working(
    client: TestClient, make_user: UserFactory, db_session: Session
) -> None:
    user = make_user()
    headers = auth_headers(login(client, user.email))
    user.is_active = False
    db_session.flush()
    response = client.get(ME, headers=headers)
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "inactive_user"


def test_refresh_rotates_the_token(
    client: TestClient, make_user: UserFactory, db_session: Session
) -> None:
    user = make_user()
    login(client, user.email)
    first_cookie = client.cookies.get(settings.refresh_cookie_name)

    response = client.post(REFRESH)
    assert response.status_code == 200
    assert response.json()["access_token"]
    second_cookie = client.cookies.get(settings.refresh_cookie_name)
    assert second_cookie
    assert second_cookie != first_cookie

    tokens = _tokens(db_session, user)
    assert len(tokens) == 2
    assert sum(t.revoked_at is None for t in tokens) == 1


def test_refresh_without_cookie_is_unauthorized(client: TestClient) -> None:
    response = client.post(REFRESH)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_refresh_token"


def test_reusing_a_rotated_token_revokes_all_sessions(
    client: TestClient, make_user: UserFactory, db_session: Session
) -> None:
    user = make_user()
    login(client, user.email)
    stolen = client.cookies.get(settings.refresh_cookie_name)
    assert client.post(REFRESH).status_code == 200

    # Pretend the rotation happened long ago (outside the concurrent-refresh grace window).
    for token in _tokens(db_session, user):
        if token.revoked_at is not None:
            token.revoked_at = utcnow() - timedelta(minutes=5)
    db_session.flush()

    _use_refresh_cookie(client, stolen)
    response = client.post(REFRESH)
    assert response.status_code == 401
    assert all(t.revoked_at is not None for t in _tokens(db_session, user))


def test_reuse_within_grace_window_does_not_revoke_other_sessions(
    client: TestClient, make_user: UserFactory, db_session: Session
) -> None:
    user = make_user()
    login(client, user.email)
    old = client.cookies.get(settings.refresh_cookie_name)
    assert client.post(REFRESH).status_code == 200

    _use_refresh_cookie(client, old)
    response = client.post(REFRESH)
    assert response.status_code == 401
    assert sum(t.revoked_at is None for t in _tokens(db_session, user)) == 1


def test_expired_refresh_token_is_rejected(
    client: TestClient, make_user: UserFactory, db_session: Session
) -> None:
    user = make_user()
    login(client, user.email)
    [token] = _tokens(db_session, user)
    token.expires_at = utcnow() - timedelta(seconds=1)
    db_session.flush()
    assert client.post(REFRESH).status_code == 401


def test_logout_revokes_refresh_token_and_clears_cookie(
    client: TestClient, make_user: UserFactory, db_session: Session
) -> None:
    user = make_user()
    login(client, user.email)
    cookie = client.cookies.get(settings.refresh_cookie_name)

    response = client.post(LOGOUT)
    assert response.status_code == 204
    assert 'refresh_token=""' in response.headers["set-cookie"]
    assert all(t.revoked_at is not None for t in _tokens(db_session, user))

    _use_refresh_cookie(client, cookie)
    replay = client.post(REFRESH)
    assert replay.status_code == 401


def test_logout_is_idempotent(client: TestClient) -> None:
    assert client.post(LOGOUT).status_code == 204


def test_update_profile(client: TestClient, make_user: UserFactory) -> None:
    user = make_user()
    headers = auth_headers(login(client, user.email))
    response = client.patch(ME, json={"name": "  New Name  "}, headers=headers)
    assert response.status_code == 200
    assert response.json()["name"] == "New Name"
    assert client.patch(ME, json={"name": ""}, headers=headers).status_code == 422
    assert client.patch(ME, json={"email": "x@example.com"}, headers=headers).status_code == 422


def test_change_password_with_wrong_current_password(
    client: TestClient, make_user: UserFactory
) -> None:
    user = make_user()
    headers = auth_headers(login(client, user.email))
    response = client.post(
        f"{ME}/password",
        json={"current_password": "wrong-one", "new_password": "An0ther-Passw0rd"},
        headers=headers,
    )
    assert response.status_code == 400
    assert response.json()["error"]["details"][0]["field"] == "current_password"


def test_change_password_revokes_other_sessions_only(
    client: TestClient, make_user: UserFactory, db_session: Session
) -> None:
    user = make_user()
    login(client, user.email)  # "other device"
    client.cookies.clear()
    headers = auth_headers(login(client, user.email))  # current device

    response = client.post(
        f"{ME}/password",
        json={"current_password": DEFAULT_PASSWORD, "new_password": "An0ther-Passw0rd"},
        headers=headers,
    )
    assert response.status_code == 204
    assert sum(t.revoked_at is None for t in _tokens(db_session, user)) == 1
    assert client.post(REFRESH).status_code == 200  # current session survives

    client.cookies.clear()
    old = client.post(LOGIN, json={"email": user.email, "password": DEFAULT_PASSWORD})
    assert old.status_code == 401
    login(client, user.email, "An0ther-Passw0rd")

from fastapi.testclient import TestClient

from tests.conftest import UserFactory, auth_headers, login

AUDIT = "/api/v1/audit-logs"


def test_admin_can_list_audit_logs_newest_first(
    client: TestClient, admin_headers: dict[str, str], make_user: UserFactory
) -> None:
    user = make_user()
    client.post("/api/v1/auth/login", json={"email": user.email, "password": "wrong-pass"})

    body = client.get(AUDIT, headers=admin_headers).json()
    assert body["page_size"] == 10
    actions = [entry["action"] for entry in body["items"]]
    assert actions[0] == "auth.login.failed"
    assert "auth.login.succeeded" in actions
    keys = [(e["created_at"], e["id"]) for e in body["items"]]
    assert keys == sorted(keys, reverse=True)


def test_audit_log_filters(
    client: TestClient, admin_headers: dict[str, str], make_user: UserFactory
) -> None:
    user = make_user()
    login(client, user.email)
    body = client.get(AUDIT, params={"actor_user_id": user.id}, headers=admin_headers).json()
    assert body["total"] == 1
    entry = body["items"][0]
    assert entry["actor"]["id"] == user.id
    assert entry["resource_type"] == "user"
    assert entry["resource_id"] == str(user.id)


def test_manager_cannot_read_audit_logs(client: TestClient, make_user: UserFactory) -> None:
    headers = auth_headers(login(client, make_user(role="manager").email))
    assert client.get(AUDIT, headers=headers).status_code == 403

from app.models import Role
from fastapi.testclient import TestClient

from tests.conftest import UserFactory, auth_headers, login

ROLES = "/api/v1/roles"


def test_roles_are_seeded_by_migration(client: TestClient, admin_headers: dict[str, str]) -> None:
    body = client.get(ROLES, headers=admin_headers).json()
    assert [r["name"] for r in body["items"]] == ["admin", "manager", "user"]
    assert all(r["is_system"] for r in body["items"])
    assert body["page_size"] == 10


def test_manager_can_list_but_user_cannot(client: TestClient, make_user: UserFactory) -> None:
    manager = auth_headers(login(client, make_user(role="manager").email))
    assert client.get(ROLES, headers=manager).status_code == 200
    assert client.post(ROLES, json={"name": "auditor"}, headers=manager).status_code == 403
    client.cookies.clear()
    user = auth_headers(login(client, make_user(role="user").email))
    assert client.get(ROLES, headers=user).status_code == 403


def test_create_update_delete_custom_role(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    created = client.post(
        ROLES, json={"name": "Auditor", "description": "Reads logs"}, headers=admin_headers
    )
    assert created.status_code == 201
    role = created.json()
    assert role["name"] == "auditor"
    assert role["is_system"] is False
    assert role["user_count"] == 0

    duplicate = client.post(ROLES, json={"name": "auditor"}, headers=admin_headers)
    assert duplicate.status_code == 409

    renamed = client.patch(
        f"{ROLES}/{role['id']}", json={"name": "reviewer"}, headers=admin_headers
    )
    assert renamed.status_code == 200
    assert renamed.json()["name"] == "reviewer"
    assert renamed.json()["description"] == "Reads logs"

    assert client.delete(f"{ROLES}/{role['id']}", headers=admin_headers).status_code == 204
    assert client.get(f"{ROLES}/{role['id']}", headers=admin_headers).status_code == 404


def test_role_name_validation(client: TestClient, admin_headers: dict[str, str]) -> None:
    for bad in ["", "a", "1abc", "has space", "x" * 51]:
        response = client.post(ROLES, json={"name": bad}, headers=admin_headers)
        assert response.status_code == 422, bad


def test_system_roles_are_protected(
    client: TestClient, admin_headers: dict[str, str], roles: dict[str, Role]
) -> None:
    manager_id = roles["manager"].id
    rename = client.patch(f"{ROLES}/{manager_id}", json={"name": "boss"}, headers=admin_headers)
    assert rename.status_code == 400
    describe = client.patch(
        f"{ROLES}/{manager_id}", json={"description": "Team leads"}, headers=admin_headers
    )
    assert describe.status_code == 200
    assert client.delete(f"{ROLES}/{manager_id}", headers=admin_headers).status_code == 400


def test_role_in_use_cannot_be_deleted(client: TestClient, admin_headers: dict[str, str]) -> None:
    role = client.post(ROLES, json={"name": "temp_role"}, headers=admin_headers).json()
    payload = {
        "name": "T",
        "email": "t@example.com",
        "password": "Passw0rd!",
        "role_id": role["id"],
    }
    assert client.post("/api/v1/users", json=payload, headers=admin_headers).status_code == 201
    response = client.delete(f"{ROLES}/{role['id']}", headers=admin_headers)
    assert response.status_code == 409


def test_roles_search_and_pagination(client: TestClient, admin_headers: dict[str, str]) -> None:
    for index in range(12):
        client.post(ROLES, json={"name": f"team_{index:02d}"}, headers=admin_headers)
    first = client.get(ROLES, params={"search": "team"}, headers=admin_headers).json()
    assert first["total"] == 12
    assert len(first["items"]) == 10
    assert first["total_pages"] == 2
    second = client.get(ROLES, params={"search": "team", "page": 2}, headers=admin_headers).json()
    assert [r["name"] for r in second["items"]] == ["team_10", "team_11"]

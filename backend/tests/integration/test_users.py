from app.models import RefreshToken, Role, User
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from tests.conftest import UserFactory, auth_headers, login

USERS = "/api/v1/users"


def _headers_for(client: TestClient, make_user: UserFactory, role: str) -> dict[str, str]:
    return auth_headers(login(client, make_user(role=role).email))


# --- Authorization ---------------------------------------------------------------------
def test_listing_users_requires_authentication(client: TestClient) -> None:
    assert client.get(USERS).status_code == 401


def test_plain_user_cannot_list_users(client: TestClient, make_user: UserFactory) -> None:
    response = client.get(USERS, headers=_headers_for(client, make_user, "user"))
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


def test_manager_can_read_but_not_write(
    client: TestClient, make_user: UserFactory, roles: dict[str, Role]
) -> None:
    headers = _headers_for(client, make_user, "manager")
    assert client.get(USERS, headers=headers).status_code == 200
    payload = {
        "name": "X",
        "email": "x@example.com",
        "password": "Passw0rd!",
        "role_id": roles["user"].id,
    }
    assert client.post(USERS, json=payload, headers=headers).status_code == 403


# --- Pagination ------------------------------------------------------------------------
def test_default_page_size_is_10(
    client: TestClient, make_user: UserFactory, admin_headers: dict[str, str]
) -> None:
    for _ in range(14):
        make_user()
    body = client.get(USERS, headers=admin_headers).json()
    assert body["page"] == 1
    assert body["page_size"] == 10
    assert len(body["items"]) == 10
    assert body["total"] == 15  # 14 + admin
    assert body["total_pages"] == 2

    second = client.get(USERS, params={"page": 2}, headers=admin_headers).json()
    assert len(second["items"]) == 5
    first_ids = {u["id"] for u in body["items"]}
    assert first_ids.isdisjoint({u["id"] for u in second["items"]})


def test_page_beyond_last_returns_empty_items(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    body = client.get(USERS, params={"page": 99}, headers=admin_headers).json()
    assert body["items"] == []
    assert body["total"] == 1
    assert body["page"] == 99


def test_page_size_and_page_are_validated(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    too_big = client.get(USERS, params={"page_size": 101}, headers=admin_headers)
    assert too_big.status_code == 422
    assert too_big.json()["error"]["details"][0]["field"] == "page_size"
    assert client.get(USERS, params={"page_size": 0}, headers=admin_headers).status_code == 422
    assert client.get(USERS, params={"page": 0}, headers=admin_headers).status_code == 422
    ok = client.get(USERS, params={"page_size": 100}, headers=admin_headers)
    assert ok.status_code == 200


def test_default_order_is_newest_first(
    client: TestClient, make_user: UserFactory, admin_headers: dict[str, str]
) -> None:
    for _ in range(3):
        make_user()
    items = client.get(USERS, headers=admin_headers).json()["items"]
    keys = [(u["created_at"], u["id"]) for u in items]
    assert keys == sorted(keys, reverse=True)


# --- Filtering and sorting -------------------------------------------------------------
def test_search_role_and_status_filters(
    client: TestClient,
    make_user: UserFactory,
    admin_headers: dict[str, str],
    roles: dict[str, Role],
) -> None:
    make_user(name="Alice Manager", role="manager")
    make_user(name="Alice Inactive", is_active=False)
    make_user(name="Bob Builder")

    by_name = client.get(USERS, params={"search": "alice"}, headers=admin_headers).json()
    assert {u["name"] for u in by_name["items"]} == {"Alice Manager", "Alice Inactive"}

    inactive = client.get(
        USERS, params={"search": "alice", "is_active": "false"}, headers=admin_headers
    ).json()
    assert [u["name"] for u in inactive["items"]] == ["Alice Inactive"]

    managers = client.get(
        USERS, params={"role_id": roles["manager"].id}, headers=admin_headers
    ).json()
    assert [u["name"] for u in managers["items"]] == ["Alice Manager"]
    assert managers["total"] == 1


def test_search_treats_wildcards_literally(
    client: TestClient, make_user: UserFactory, admin_headers: dict[str, str]
) -> None:
    make_user(name="100% Real")
    make_user(name="1000 Fake")
    body = client.get(USERS, params={"search": "100%"}, headers=admin_headers).json()
    assert [u["name"] for u in body["items"]] == ["100% Real"]


def test_sort_by_name(
    client: TestClient, make_user: UserFactory, admin_headers: dict[str, str]
) -> None:
    for name in ["Zed Charlie", "Zed Alpha", "Zed Bravo"]:
        make_user(name=name)

    def names(order: str) -> list[str]:
        params = {"sort_by": "name", "sort_order": order, "search": "Zed"}
        items = client.get(USERS, params=params, headers=admin_headers).json()["items"]
        return [u["name"] for u in items]

    assert names("asc") == ["Zed Alpha", "Zed Bravo", "Zed Charlie"]
    assert names("desc") == ["Zed Charlie", "Zed Bravo", "Zed Alpha"]
    invalid = client.get(USERS, params={"sort_by": "password_hash"}, headers=admin_headers)
    assert invalid.status_code == 422


# --- Create / update -------------------------------------------------------------------
def test_admin_creates_user(
    client: TestClient, admin_headers: dict[str, str], roles: dict[str, Role]
) -> None:
    payload = {
        "name": "  New Person ",
        "email": "New.Person@Example.com",
        "password": "Passw0rd!",
        "role_id": roles["manager"].id,
    }
    response = client.post(USERS, json=payload, headers=admin_headers)
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "New Person"
    assert body["email"] == "new.person@example.com"
    assert body["role"] == {"id": roles["manager"].id, "name": "manager"}
    assert body["is_active"] is True
    assert "password" not in body
    assert "password_hash" not in body

    login(client, "new.person@example.com", "Passw0rd!")


def test_duplicate_email_conflicts(
    client: TestClient, admin: User, admin_headers: dict[str, str], roles: dict[str, Role]
) -> None:
    payload = {
        "name": "Dup",
        "email": admin.email.upper(),
        "password": "Passw0rd!",
        "role_id": roles["user"].id,
    }
    response = client.post(USERS, json=payload, headers=admin_headers)
    assert response.status_code == 409
    assert response.json()["error"]["details"][0]["field"] == "email"


def test_create_user_validation(client: TestClient, admin_headers: dict[str, str]) -> None:
    payload = {"name": "", "email": "bad", "password": "short", "role_id": 0, "extra": 1}
    response = client.post(USERS, json=payload, headers=admin_headers)
    assert response.status_code == 422
    fields = {d["field"] for d in response.json()["error"]["details"]}
    assert {"name", "email", "password", "role_id", "extra"} <= fields


def test_create_user_with_unknown_role(client: TestClient, admin_headers: dict[str, str]) -> None:
    payload = {"name": "A", "email": "a@example.com", "password": "Passw0rd!", "role_id": 9999}
    response = client.post(USERS, json=payload, headers=admin_headers)
    assert response.status_code == 400
    assert response.json()["error"]["details"][0]["field"] == "role_id"


def test_get_user_and_404(client: TestClient, admin: User, admin_headers: dict[str, str]) -> None:
    assert client.get(f"{USERS}/{admin.id}", headers=admin_headers).json()["email"] == admin.email
    missing = client.get(f"{USERS}/999999", headers=admin_headers)
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "not_found"


def test_update_user_role_and_status(
    client: TestClient,
    make_user: UserFactory,
    admin_headers: dict[str, str],
    roles: dict[str, Role],
    db_session: Session,
) -> None:
    target = make_user()
    login(client, target.email)  # creates a refresh token for the target

    response = client.patch(
        f"{USERS}/{target.id}",
        json={"role_id": roles["manager"].id, "is_active": False},
        headers=admin_headers,
    )
    assert response.status_code == 200
    assert response.json()["role"]["name"] == "manager"
    assert response.json()["is_active"] is False

    tokens = db_session.scalars(select(RefreshToken).where(RefreshToken.user_id == target.id))
    assert all(t.revoked_at is not None for t in tokens)


def test_admin_cannot_deactivate_or_demote_self(
    client: TestClient, admin: User, admin_headers: dict[str, str], roles: dict[str, Role]
) -> None:
    deactivate = client.patch(
        f"{USERS}/{admin.id}", json={"is_active": False}, headers=admin_headers
    )
    assert deactivate.status_code == 400
    demote = client.patch(
        f"{USERS}/{admin.id}", json={"role_id": roles["user"].id}, headers=admin_headers
    )
    assert demote.status_code == 400


def test_update_email_conflict(
    client: TestClient, make_user: UserFactory, admin: User, admin_headers: dict[str, str]
) -> None:
    other = make_user()
    response = client.patch(
        f"{USERS}/{other.id}", json={"email": admin.email}, headers=admin_headers
    )
    assert response.status_code == 409

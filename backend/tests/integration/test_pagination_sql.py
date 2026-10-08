"""Proves pagination, filtering, and sorting run inside PostgreSQL — not in Python.

Every SQL statement executed during a request is captured. The list query must contain WHERE,
ORDER BY, LIMIT, and OFFSET, and the database must return only one page of rows.
"""

from collections.abc import Iterator
from dataclasses import dataclass, field
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, event

from tests.conftest import UserFactory


@dataclass
class CapturedQuery:
    sql: str
    params: Any
    rowcount: int


@dataclass
class QueryLog:
    queries: list[CapturedQuery] = field(default_factory=list)

    def selects_from(self, table: str) -> list[CapturedQuery]:
        return [
            q
            for q in self.queries
            if q.sql.lstrip().upper().startswith("SELECT") and f"FROM {table}" in q.sql
        ]


@pytest.fixture
def query_log(engine: Engine) -> Iterator[QueryLog]:
    log = QueryLog()

    def after_execute(conn: Any, cursor: Any, statement: str, params: Any, *_: Any) -> None:
        log.queries.append(CapturedQuery(" ".join(statement.split()), params, cursor.rowcount))

    event.listen(engine, "after_cursor_execute", after_execute)
    yield log
    event.remove(engine, "after_cursor_execute", after_execute)


@pytest.fixture
def many_users(make_user: UserFactory) -> None:
    for index in range(30):
        make_user(name=f"Paged User {index:02d}", role="manager" if index % 3 == 0 else "user")


@pytest.mark.usefixtures("many_users")
def test_users_list_applies_limit_offset_in_sql(
    client: TestClient, admin_headers: dict[str, str], query_log: QueryLog
) -> None:
    query_log.queries.clear()
    response = client.get(
        "/api/v1/users", params={"page": 2, "page_size": 7}, headers=admin_headers
    )
    assert response.status_code == 200
    assert len(response.json()["items"]) == 7

    page_queries = [q for q in query_log.selects_from("users") if "LIMIT" in q.sql]
    assert len(page_queries) == 1
    page_query = page_queries[0]
    assert "OFFSET" in page_query.sql
    assert "ORDER BY users.created_at DESC, users.id DESC" in page_query.sql
    # LIMIT 7 and OFFSET (2 - 1) * 7 are bound parameters of the same statement.
    assert list(page_query.params.values()).count(7) == 2
    # PostgreSQL returned exactly one page — not every row.
    assert page_query.rowcount == 7
    # The password hash is not selected for list views.
    assert "password_hash" not in page_query.sql


@pytest.mark.usefixtures("many_users")
def test_filters_and_sorting_are_applied_before_pagination(
    client: TestClient, admin_headers: dict[str, str], query_log: QueryLog
) -> None:
    query_log.queries.clear()
    params = {"search": "Paged", "is_active": "true", "sort_by": "name", "sort_order": "asc"}
    response = client.get("/api/v1/users", params={**params, "page_size": 5}, headers=admin_headers)
    body = response.json()
    assert body["total"] == 30
    assert [u["name"] for u in body["items"]] == [f"Paged User {i:02d}" for i in range(5)]

    [page_query] = [q for q in query_log.selects_from("users") if "LIMIT" in q.sql]
    sql = page_query.sql
    assert "WHERE" in sql
    assert "ILIKE" in sql.upper()
    assert sql.index("WHERE") < sql.index("ORDER BY") < sql.index("LIMIT") < sql.index("OFFSET")
    assert "ORDER BY users.name ASC, users.id ASC" in sql
    assert page_query.rowcount == 5


@pytest.mark.usefixtures("many_users")
def test_list_uses_constant_number_of_queries(
    client: TestClient, admin_headers: dict[str, str], query_log: QueryLog
) -> None:
    """Count + page queries only: the role is joined in, so there is no N+1."""
    counts = []
    for page_size in (5, 25):
        query_log.queries.clear()
        client.get("/api/v1/users", params={"page_size": page_size}, headers=admin_headers)
        user_selects = [
            q for q in query_log.selects_from("users") if "count(" in q.sql or "LIMIT" in q.sql
        ]
        role_selects = [
            q for q in query_log.queries if "FROM roles" in q.sql and "JOIN" not in q.sql
        ]
        counts.append((len(user_selects), len(role_selects)))
    assert counts[0] == counts[1] == (2, 0)


@pytest.mark.usefixtures("many_users")
def test_roles_list_counts_users_in_one_statement(
    client: TestClient, admin_headers: dict[str, str], query_log: QueryLog
) -> None:
    query_log.queries.clear()
    body = client.get("/api/v1/roles", headers=admin_headers).json()
    counts = {r["name"]: r["user_count"] for r in body["items"]}
    assert counts["manager"] == 10
    assert counts["user"] == 20
    assert counts["admin"] == 1
    [page_query] = [q for q in query_log.selects_from("roles") if "LIMIT" in q.sql]
    assert "count(users.id)" in page_query.sql

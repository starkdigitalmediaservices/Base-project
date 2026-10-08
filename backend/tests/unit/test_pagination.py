import pytest
from app.models import User
from app.repositories.base import apply_page, page_is_out_of_range
from app.schemas.pagination import Page, PageParams, SortOrder
from app.utils.sql import contains_pattern, escape_like, ordering
from sqlalchemy import select
from sqlalchemy.dialects import postgresql


@pytest.mark.parametrize(
    ("total", "page_size", "expected"),
    [(0, 10, 0), (1, 10, 1), (10, 10, 1), (11, 10, 2), (95, 10, 10), (100, 25, 4)],
)
def test_total_pages(total: int, page_size: int, expected: int) -> None:
    page = Page[int].create([], total=total, params=PageParams(page=1, page_size=page_size))
    assert page.total_pages == expected
    assert page.page_size == page_size


def test_offset_is_derived_from_page() -> None:
    assert PageParams(page=1, page_size=10).offset == 0
    assert PageParams(page=3, page_size=25).offset == 50


def test_out_of_range_detection() -> None:
    assert page_is_out_of_range(0, PageParams(page=1, page_size=10))
    assert not page_is_out_of_range(11, PageParams(page=2, page_size=10))
    assert page_is_out_of_range(10, PageParams(page=2, page_size=10))


def test_apply_page_adds_order_limit_offset_to_sql() -> None:
    stmt = apply_page(
        select(User).where(User.is_active.is_(True)),
        PageParams(page=3, page_size=20),
        ordering(User.created_at, SortOrder.DESC, tiebreaker=User.id),
    )
    sql = str(
        stmt.compile(dialect=postgresql.psycopg.dialect(), compile_kwargs={"literal_binds": True})
    ).replace("\n", " ")
    assert "WHERE users.is_active IS true" in sql
    assert "ORDER BY users.created_at DESC, users.id DESC" in sql
    assert "LIMIT 20 OFFSET 40" in sql
    # Filtering and ordering come before LIMIT/OFFSET in the single statement.
    assert sql.index("WHERE") < sql.index("ORDER BY") < sql.index("LIMIT")


def test_ordering_always_adds_tiebreaker() -> None:
    asc = ordering(User.name, SortOrder.ASC, tiebreaker=User.id)
    assert [str(c) for c in asc] == ["users.name ASC", "users.id ASC"]


def test_like_wildcards_are_escaped() -> None:
    assert escape_like("50%_off\\") == "50\\%\\_off\\\\"
    assert contains_pattern("a_b") == "%a\\_b%"

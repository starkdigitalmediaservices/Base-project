"""Database-level pagination helpers.

Mandatory rule: list endpoints never load every row. Filters and ORDER BY are part of the SQL
statement, and LIMIT/OFFSET are applied by PostgreSQL. Python only ever sees one page.
"""

from typing import Any, TypeVar

from sqlalchemy import ColumnElement, Select, func, select
from sqlalchemy.orm import Session

from app.schemas.pagination import PageParams

SelectT = TypeVar("SelectT", bound=Select[Any])


def count_rows(session: Session, stmt: Select[Any]) -> int:
    """`SELECT count(*)` over the filtered statement (ordering and loader options removed)."""
    count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
    return session.scalar(count_stmt) or 0


def apply_page(stmt: SelectT, params: PageParams, order_by: list[ColumnElement[Any]]) -> SelectT:
    """Attach a deterministic ORDER BY plus LIMIT/OFFSET to the statement."""
    return stmt.order_by(*order_by).limit(params.limit).offset(params.offset)


def page_is_out_of_range(total: int, params: PageParams) -> bool:
    """True when the requested page starts beyond the last row; the page query can be skipped."""
    return params.offset >= total

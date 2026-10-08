"""Small SQL helpers shared by repositories."""

from sqlalchemy import ColumnElement
from sqlalchemy.orm import InstrumentedAttribute

from app.schemas.pagination import SortOrder

LIKE_ESCAPE_CHAR = "\\"


def escape_like(term: str) -> str:
    """Escape LIKE/ILIKE wildcards so user input is matched literally."""
    return (
        term.replace(LIKE_ESCAPE_CHAR, LIKE_ESCAPE_CHAR * 2)
        .replace("%", f"{LIKE_ESCAPE_CHAR}%")
        .replace("_", f"{LIKE_ESCAPE_CHAR}_")
    )


def contains_pattern(term: str) -> str:
    return f"%{escape_like(term)}%"


def ordering(
    column: InstrumentedAttribute[object] | ColumnElement[object],
    order: SortOrder,
    *,
    tiebreaker: InstrumentedAttribute[object] | ColumnElement[object],
) -> list[ColumnElement[object]]:
    """A deterministic ORDER BY: the requested column plus a unique tiebreaker (usually the id).

    Without the tiebreaker, rows with equal sort values can move between pages.
    """
    if order == SortOrder.ASC:
        return [column.asc(), tiebreaker.asc()]
    return [column.desc(), tiebreaker.desc()]

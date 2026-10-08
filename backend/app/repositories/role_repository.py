from collections.abc import Sequence
from typing import Any

from sqlalchemy import ColumnElement, exists, func, select
from sqlalchemy.orm import Session

from app.models import Role, User
from app.repositories.base import apply_page, count_rows, page_is_out_of_range
from app.schemas.pagination import PageParams
from app.schemas.role import RoleListQuery, RoleSortField
from app.utils.sql import contains_pattern, ordering

_SORT_COLUMNS: dict[RoleSortField, Any] = {
    RoleSortField.NAME: Role.name,
    RoleSortField.CREATED_AT: Role.created_at,
}


def _user_count_column() -> ColumnElement[int]:
    # Correlated subquery: counts users for the roles on the current page only, using the
    # index on users.role_id. One SQL statement — no N+1 queries.
    return (
        select(func.count(User.id))
        .where(User.role_id == Role.id)
        .correlate(Role)
        .scalar_subquery()
        .label("user_count")
    )


class RoleRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, role_id: int) -> Role | None:
        return self.session.get(Role, role_id)

    def get_by_name(self, name: str) -> Role | None:
        return self.session.scalar(select(Role).where(Role.name == name))

    def get_with_user_count(self, role_id: int) -> tuple[Role, int] | None:
        stmt = select(Role, _user_count_column()).where(Role.id == role_id)
        row = self.session.execute(stmt).first()
        return (row[0], int(row[1])) if row is not None else None

    def name_exists(self, name: str, *, exclude_id: int | None = None) -> bool:
        condition = Role.name == name
        if exclude_id is not None:
            condition = condition & (Role.id != exclude_id)
        return bool(self.session.scalar(select(exists().where(condition))))

    def has_users(self, role_id: int) -> bool:
        return bool(self.session.scalar(select(exists().where(User.role_id == role_id))))

    def list_page(
        self, query: RoleListQuery, params: PageParams
    ) -> tuple[Sequence[tuple[Role, int]], int]:
        base = select(Role)
        if query.search:
            base = base.where(Role.name.ilike(contains_pattern(query.search), escape="\\"))

        total = count_rows(self.session, base)
        if page_is_out_of_range(total, params):
            return [], total

        stmt = base.add_columns(_user_count_column())
        order_by = ordering(_SORT_COLUMNS[query.sort_by], query.sort_order, tiebreaker=Role.id)
        result = self.session.execute(apply_page(stmt, params, order_by))
        return [(row[0], int(row[1])) for row in result], total

    def add(self, role: Role) -> Role:
        self.session.add(role)
        self.session.flush()
        return role

    def delete(self, role: Role) -> None:
        self.session.delete(role)
        self.session.flush()

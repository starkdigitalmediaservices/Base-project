from collections.abc import Sequence
from typing import Any

from sqlalchemy import ColumnElement, exists, or_, select
from sqlalchemy.orm import Session, joinedload, load_only

from app.models import Role, User
from app.repositories.base import apply_page, count_rows, page_is_out_of_range
from app.schemas.pagination import PageParams
from app.schemas.user import UserListQuery, UserSortField
from app.utils.sql import contains_pattern, ordering

_SORT_COLUMNS: dict[UserSortField, Any] = {
    UserSortField.CREATED_AT: User.created_at,
    UserSortField.NAME: User.name,
    UserSortField.EMAIL: User.email,
}

# Columns needed by list views; the password hash is never loaded for lists.
_LIST_COLUMNS = load_only(
    User.id, User.name, User.email, User.is_active, User.role_id, User.created_at, User.updated_at
)
_WITH_ROLE = joinedload(User.role).load_only(Role.id, Role.name)


class UserRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, user_id: int) -> User | None:
        stmt = select(User).options(joinedload(User.role)).where(User.id == user_id)
        return self.session.scalar(stmt)

    def get_by_email(self, email: str) -> User | None:
        stmt = select(User).options(joinedload(User.role)).where(User.email == email.lower())
        return self.session.scalar(stmt)

    def email_exists(self, email: str, *, exclude_id: int | None = None) -> bool:
        condition = User.email == email.lower()
        if exclude_id is not None:
            condition = condition & (User.id != exclude_id)
        return bool(self.session.scalar(select(exists().where(condition))))

    @staticmethod
    def _filters(query: UserListQuery) -> list[ColumnElement[bool]]:
        conditions: list[ColumnElement[bool]] = []
        if query.search:
            pattern = contains_pattern(query.search)
            conditions.append(
                or_(User.name.ilike(pattern, escape="\\"), User.email.ilike(pattern, escape="\\"))
            )
        if query.role_id is not None:
            conditions.append(User.role_id == query.role_id)
        if query.is_active is not None:
            conditions.append(User.is_active.is_(query.is_active))
        return conditions

    def list_page(self, query: UserListQuery, params: PageParams) -> tuple[Sequence[User], int]:
        # 1) Filters are part of the SQL WHERE clause.
        base = select(User).where(*self._filters(query))

        # 2) COUNT(*) over the filtered set (for total / total_pages).
        total = count_rows(self.session, base)
        if page_is_out_of_range(total, params):
            return [], total

        # 3) ORDER BY + LIMIT/OFFSET executed by PostgreSQL; the role is joined in the same
        #    statement (no N+1) and only the needed columns are selected.
        order_by = ordering(_SORT_COLUMNS[query.sort_by], query.sort_order, tiebreaker=User.id)
        stmt = apply_page(base.options(_LIST_COLUMNS, _WITH_ROLE), params, order_by)
        return self.session.scalars(stmt).all(), total

    def add(self, user: User) -> User:
        self.session.add(user)
        self.session.flush()
        return user

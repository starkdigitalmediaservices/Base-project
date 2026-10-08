from collections.abc import Sequence

from sqlalchemy import ColumnElement, select
from sqlalchemy.orm import Session, joinedload

from app.models import AuditLog, User
from app.repositories.base import apply_page, count_rows, page_is_out_of_range
from app.schemas.audit_log import AuditLogListQuery
from app.schemas.pagination import PageParams, SortOrder
from app.utils.sql import ordering


class AuditLogRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, entry: AuditLog) -> AuditLog:
        self.session.add(entry)
        return entry

    def list_page(
        self, query: AuditLogListQuery, params: PageParams
    ) -> tuple[Sequence[AuditLog], int]:
        conditions: list[ColumnElement[bool]] = []
        if query.action:
            conditions.append(AuditLog.action == query.action)
        if query.actor_user_id is not None:
            conditions.append(AuditLog.actor_user_id == query.actor_user_id)
        if query.resource_type:
            conditions.append(AuditLog.resource_type == query.resource_type)
        if query.resource_id:
            conditions.append(AuditLog.resource_id == query.resource_id)

        base = select(AuditLog).where(*conditions)
        total = count_rows(self.session, base)
        if page_is_out_of_range(total, params):
            return [], total

        order_by = ordering(AuditLog.created_at, SortOrder.DESC, tiebreaker=AuditLog.id)
        actor = joinedload(AuditLog.actor).load_only(User.id, User.name, User.email)
        stmt = apply_page(base.options(actor), params, order_by)
        return self.session.scalars(stmt).all(), total

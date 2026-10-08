from enum import StrEnum
from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditLog
from app.repositories.audit_log_repository import AuditLogRepository
from app.schemas.audit_log import AuditLogListQuery, AuditLogRead
from app.schemas.pagination import Page, PageParams
from app.utils.request import ClientInfo


class AuditAction(StrEnum):
    LOGIN_SUCCEEDED = "auth.login.succeeded"
    LOGIN_FAILED = "auth.login.failed"
    LOGOUT = "auth.logout"
    REFRESH_TOKEN_REUSED = "auth.refresh_token.reused"  # noqa: S105 - event name
    PASSWORD_CHANGED = "auth.password.changed"  # noqa: S105 - event name
    PROFILE_UPDATED = "auth.profile.updated"
    USER_CREATED = "user.created"
    USER_UPDATED = "user.updated"
    ROLE_CREATED = "role.created"
    ROLE_UPDATED = "role.updated"
    ROLE_DELETED = "role.deleted"


class AuditService:
    """Records audit events in the caller's transaction (the caller commits)."""

    def __init__(self, session: Session) -> None:
        self.repository = AuditLogRepository(session)

    def record(
        self,
        action: AuditAction,
        *,
        actor_id: int | None = None,
        resource_type: str | None = None,
        resource_id: int | str | None = None,
        metadata: dict[str, Any] | None = None,
        client: ClientInfo | None = None,
    ) -> None:
        self.repository.add(
            AuditLog(
                actor_user_id=actor_id,
                action=action.value,
                resource_type=resource_type,
                resource_id=str(resource_id) if resource_id is not None else None,
                event_metadata=metadata or {},
                ip_address=client.ip_address if client else None,
                user_agent=client.user_agent if client else None,
            )
        )

    def list_page(self, query: AuditLogListQuery, params: PageParams) -> Page[AuditLogRead]:
        items, total = self.repository.list_page(query, params)
        return Page[AuditLogRead].create(
            [AuditLogRead.model_validate(item) for item in items], total=total, params=params
        )

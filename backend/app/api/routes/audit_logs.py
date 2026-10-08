from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import DbSession, PageParamsDep, require_permission
from app.core.permissions import Permission
from app.schemas.audit_log import AuditLogListQuery, AuditLogRead
from app.schemas.common import error_responses
from app.schemas.pagination import Page
from app.services.audit_service import AuditService

router = APIRouter(dependencies=[Depends(require_permission(Permission.AUDIT_LOGS_READ))])


@router.get(
    "",
    summary="List audit log entries (paginated)",
    response_model=Page[AuditLogRead],
    responses=error_responses(401, 403, 422),
)
def list_audit_logs(
    db: DbSession,
    page: PageParamsDep,
    filters: Annotated[AuditLogListQuery, Query()],
) -> Page[AuditLogRead]:
    """Newest first (`created_at DESC, id DESC`)."""
    return AuditService(db).list_page(filters, page)

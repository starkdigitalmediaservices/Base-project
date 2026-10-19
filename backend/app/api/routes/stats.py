"""Dashboard statistics endpoint."""

from fastapi import APIRouter, Depends

from app.api.dependencies import DbSession, require_permission
from app.core.permissions import Permission
from app.schemas.common import error_responses
from app.schemas.stats import DashboardStats
from app.services.stats_service import StatsService

router = APIRouter(dependencies=[Depends(require_permission(Permission.USERS_READ))])


@router.get(
    "",
    summary="Dashboard statistics",
    response_model=DashboardStats,
    responses=error_responses(401, 403),
)
def get_stats(db: DbSession) -> DashboardStats:
    """Aggregated counts for the dashboard. Requires ``users:read`` permission."""
    return StatsService(db).get_dashboard_stats()

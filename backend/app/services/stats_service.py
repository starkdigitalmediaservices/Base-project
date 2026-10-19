"""Dashboard statistics aggregated from the foundation tables."""

from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import AuditLog, Role, User
from app.schemas.stats import DashboardStats
from app.utils.time import utcnow


class StatsService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_dashboard_stats(self) -> DashboardStats:
        since_24h = utcnow() - timedelta(hours=24)

        total_users: int = self.session.scalar(select(func.count(User.id))) or 0
        active_users: int = (
            self.session.scalar(select(func.count(User.id)).where(User.is_active.is_(True))) or 0
        )
        total_roles: int = self.session.scalar(select(func.count(Role.id))) or 0

        logins_last_24h: int = (
            self.session.scalar(
                select(func.count(AuditLog.id)).where(
                    AuditLog.action == "auth.login.succeeded",
                    AuditLog.created_at >= since_24h,
                )
            )
            or 0
        )
        failed_logins_last_24h: int = (
            self.session.scalar(
                select(func.count(AuditLog.id)).where(
                    AuditLog.action == "auth.login.failed",
                    AuditLog.created_at >= since_24h,
                )
            )
            or 0
        )

        return DashboardStats(
            total_users=total_users,
            active_users=active_users,
            inactive_users=total_users - active_users,
            total_roles=total_roles,
            logins_last_24h=logins_last_24h,
            failed_logins_last_24h=failed_logins_last_24h,
        )

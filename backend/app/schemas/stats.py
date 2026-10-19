"""Schemas for the dashboard statistics endpoint."""

from app.schemas.common import AppSchema


class DashboardStats(AppSchema):
    total_users: int
    active_users: int
    inactive_users: int
    total_roles: int
    logins_last_24h: int
    failed_logins_last_24h: int

"""Import every model here so `Base.metadata` is complete for Alembic autogenerate."""

from app.models.audit_log import AuditLog
from app.models.refresh_token import RefreshToken
from app.models.role import Role
from app.models.user import User

__all__ = ["AuditLog", "RefreshToken", "Role", "User"]

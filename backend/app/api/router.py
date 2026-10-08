"""Version 1 API router. Register every new route module here."""

from fastapi import APIRouter

from app.api.routes import audit_logs, auth, health, roles, users

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(roles.router, prefix="/roles", tags=["roles"])
api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["audit-logs"])

OPENAPI_TAGS = [
    {"name": "health", "description": "Liveness and readiness probes."},
    {"name": "auth", "description": "Login, token refresh, logout, and the current account."},
    {"name": "users", "description": "User administration (permission-protected)."},
    {"name": "roles", "description": "Role administration (permission-protected)."},
    {"name": "audit-logs", "description": "Read-only audit trail (admin only)."},
]

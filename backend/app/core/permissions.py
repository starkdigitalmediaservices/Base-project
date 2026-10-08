"""Central role → permission policy.

This is the ONLY place where authorization decisions are defined. Routes declare the
permission they need via `require_permission(...)` (see `app.api.dependencies`); they never
compare role names themselves.

Each user has exactly one role (`users.role_id` → `roles.id`); the role's `name` is the key
into `ROLE_PERMISSIONS`. Roles created at runtime without an entry here grant no permissions
until a developer adds them to this map.
"""

from enum import StrEnum


class RoleName(StrEnum):
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"


class Permission(StrEnum):
    USERS_READ = "users:read"
    USERS_WRITE = "users:write"
    ROLES_READ = "roles:read"
    ROLES_WRITE = "roles:write"
    AUDIT_LOGS_READ = "audit_logs:read"


# Roles seeded by migration; they cannot be renamed or deleted through the API.
SYSTEM_ROLES: frozenset[str] = frozenset(role.value for role in RoleName)

ROLE_PERMISSIONS: dict[str, frozenset[Permission]] = {
    RoleName.ADMIN: frozenset(Permission),
    RoleName.MANAGER: frozenset({Permission.USERS_READ, Permission.ROLES_READ}),
    RoleName.USER: frozenset(),
}


def permissions_for_role(role_name: str) -> frozenset[Permission]:
    return ROLE_PERMISSIONS.get(role_name, frozenset())


def role_has_permission(role_name: str, permission: Permission) -> bool:
    return permission in permissions_for_role(role_name)

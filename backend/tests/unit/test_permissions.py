from app.core.permissions import (
    SYSTEM_ROLES,
    Permission,
    RoleName,
    permissions_for_role,
    role_has_permission,
)


def test_admin_has_every_permission() -> None:
    assert permissions_for_role(RoleName.ADMIN) == frozenset(Permission)


def test_manager_is_read_only() -> None:
    assert role_has_permission(RoleName.MANAGER, Permission.USERS_READ)
    assert role_has_permission(RoleName.MANAGER, Permission.ROLES_READ)
    assert not role_has_permission(RoleName.MANAGER, Permission.USERS_WRITE)
    assert not role_has_permission(RoleName.MANAGER, Permission.AUDIT_LOGS_READ)


def test_user_and_unknown_roles_have_no_permissions() -> None:
    assert permissions_for_role(RoleName.USER) == frozenset()
    assert permissions_for_role("not-a-role") == frozenset()


def test_system_roles() -> None:
    assert {"admin", "manager", "user"} == SYSTEM_ROLES

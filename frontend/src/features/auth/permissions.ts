/**
 * Permission strings granted by the backend (see backend permission map). The backend is the
 * source of truth: the current user's permissions arrive in GET /auth/me and the token response.
 * The UI only uses them to hide/disable things — the API always re-checks authorization.
 */
export const PERMISSIONS = {
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  ROLES_READ: 'roles:read',
  ROLES_WRITE: 'roles:write',
  AUDIT_LOGS_READ: 'audit_logs:read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** System roles seeded by the backend; they cannot be renamed or deleted. */
export const SYSTEM_ROLES = ['admin', 'manager', 'user'] as const;

export function userHasPermission(
  permissions: readonly string[] | undefined,
  permission: Permission | undefined,
): boolean {
  if (!permission) return true;
  return permissions?.includes(permission) ?? false;
}

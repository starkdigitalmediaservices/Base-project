import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';

import type { Permission } from '@/features/auth/permissions';
import { useAuth } from '@/features/auth/useAuth';

import { ROUTES } from './paths';

interface RequirePermissionProps {
  permission: Permission;
  children?: ReactNode;
}

/**
 * Permission-aware route guard (UX only — the API enforces authorization on every request).
 * Users without the permission are sent to the Unauthorized page.
 */
export function RequirePermission({ permission, children }: RequirePermissionProps) {
  const { hasPermission } = useAuth();
  const location = useLocation();

  if (!hasPermission(permission)) {
    return <Navigate to={ROUTES.unauthorized} replace state={{ from: location }} />;
  }
  return children ?? <Outlet />;
}

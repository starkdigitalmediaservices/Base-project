import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';

import { FullPageLoader } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/features/auth/useAuth';

import { ROUTES } from './paths';

/** Protected route: waits for session restore, then redirects anonymous users to /login. */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'initializing') {
    return <FullPageLoader label="Restoring your session…" />;
  }
  if (status === 'anonymous') {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }
  return children ?? <Outlet />;
}

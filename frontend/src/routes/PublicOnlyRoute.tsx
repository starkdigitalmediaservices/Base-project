import type { ReactNode } from 'react';
import { type Location, Navigate, Outlet, useLocation } from 'react-router';

import { FullPageLoader } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/features/auth/useAuth';

import { ROUTES } from './paths';

/** Routes such as /login: signed-in users are redirected back to where they came from. */
export function PublicOnlyRoute({ children }: { children?: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'initializing') {
    return <FullPageLoader label="Restoring your session…" />;
  }
  if (status === 'authenticated') {
    const from = (location.state as { from?: Location } | null)?.from;
    const target = from && from.pathname !== ROUTES.login ? from : ROUTES.dashboard;
    return <Navigate to={target} replace />;
  }
  return children ?? <Outlet />;
}

import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';

import { PERMISSIONS } from '@/features/auth/permissions';
import { AppLayout } from '@/layouts/AppLayout/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout/AuthLayout';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';

import { ROUTES } from './paths';
import { PublicOnlyRoute } from './PublicOnlyRoute';
import { RequireAuth } from './RequireAuth';
import {
  AccountPage,
  ComponentShowcasePage,
  DashboardPage,
  LoginPage,
  RolesPage,
  UsersPage,
} from './lazyPages';
import { RequirePermission } from './RequirePermission';
import { RouteErrorPage } from './RouteErrorPage';
import type { RouteHandle } from './routeHandle';

const crumb = (label: string): RouteHandle => ({ crumb: label });

/**
 * Route tree:
 * - public-only routes (login) inside AuthLayout;
 * - protected routes (RequireAuth) inside AppLayout, with permission-guarded admin routes;
 * - catch-all Not Found.
 */
export const routes: RouteObject[] = [
  {
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <PublicOnlyRoute />,
        children: [
          {
            element: <AuthLayout />,
            children: [{ path: ROUTES.login, element: <LoginPage /> }],
          },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            path: ROUTES.root,
            element: <AppLayout />,
            handle: crumb('Home'),
            children: [
              { index: true, element: <Navigate to={ROUTES.dashboard} replace /> },
              { path: 'dashboard', element: <DashboardPage />, handle: crumb('Dashboard') },
              {
                path: 'components',
                element: <ComponentShowcasePage />,
                handle: crumb('Components'),
              },
              { path: 'account', element: <AccountPage />, handle: crumb('Profile') },
              {
                path: 'unauthorized',
                element: <UnauthorizedPage />,
                handle: crumb('Unauthorized'),
              },
              {
                path: 'admin',
                handle: crumb('Administration'),
                children: [
                  { index: true, element: <Navigate to={ROUTES.users} replace /> },
                  {
                    path: 'users',
                    handle: crumb('Users'),
                    element: (
                      <RequirePermission permission={PERMISSIONS.USERS_READ}>
                        <UsersPage />
                      </RequirePermission>
                    ),
                  },
                  {
                    path: 'roles',
                    handle: crumb('Roles'),
                    element: (
                      <RequirePermission permission={PERMISSIONS.ROLES_READ}>
                        <RolesPage />
                      </RequirePermission>
                    ),
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        element: <AuthLayout />,
        children: [{ path: '*', element: <NotFoundPage /> }],
      },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}

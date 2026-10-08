import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { AuthContext, type AuthContextValue } from '@/features/auth/authContext';
import { PERMISSIONS, userHasPermission } from '@/features/auth/permissions';
import { makeCurrentUser } from '@/test/testUtils';

import { ROUTES } from './paths';
import { PublicOnlyRoute } from './PublicOnlyRoute';
import { RequireAuth } from './RequireAuth';
import { RequirePermission } from './RequirePermission';

function renderRoutes(auth: Partial<AuthContextValue>, initialPath: string) {
  const user = auth.user === undefined ? makeCurrentUser() : auth.user;
  const value: AuthContextValue = {
    status: 'authenticated',
    user,
    isAuthenticated: auth.status === undefined || auth.status === 'authenticated',
    endReason: 'none',
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    hasPermission: (permission) => userHasPermission(user?.permissions, permission),
    ...auth,
  };
  const router = createMemoryRouter(
    [
      {
        element: <PublicOnlyRoute />,
        children: [{ path: ROUTES.login, element: <p>Login page</p> }],
      },
      { path: ROUTES.unauthorized, element: <p>Unauthorized page</p> },
      {
        element: <RequireAuth />,
        children: [
          { path: ROUTES.dashboard, element: <p>Dashboard page</p> },
          {
            path: ROUTES.users,
            element: (
              <RequirePermission permission={PERMISSIONS.USERS_READ}>
                <p>Users admin page</p>
              </RequirePermission>
            ),
          },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  );
  render(
    <AuthContext value={value}>
      <RouterProvider router={router} />
    </AuthContext>,
  );
  return router;
}

describe('route guards', () => {
  it('shows a loader while the session is being restored', () => {
    renderRoutes({ status: 'initializing', user: null }, ROUTES.dashboard);
    expect(screen.getByText('Restoring your session…')).toBeInTheDocument();
  });

  it('redirects anonymous users to the login page and remembers where they were going', () => {
    const router = renderRoutes({ status: 'anonymous', user: null }, ROUTES.users);
    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(router.state.location.state).toMatchObject({ from: { pathname: ROUTES.users } });
  });

  it('renders protected pages for authenticated users', () => {
    renderRoutes({}, ROUTES.dashboard);
    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
  });

  it('allows users with the required permission', () => {
    renderRoutes({}, ROUTES.users);
    expect(screen.getByText('Users admin page')).toBeInTheDocument();
  });

  it('sends users without the permission to the unauthorized page', () => {
    renderRoutes(
      { user: makeCurrentUser({ role: { id: 3, name: 'user' }, permissions: [] }) },
      ROUTES.users,
    );
    expect(screen.getByText('Unauthorized page')).toBeInTheDocument();
  });

  it('redirects signed-in users away from the login page', () => {
    renderRoutes({}, ROUTES.login);
    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
  });
});

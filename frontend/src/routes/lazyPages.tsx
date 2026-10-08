import { lazy } from 'react';

// Pages are code-split; each chunk loads on first navigation (Suspense fallback in the layout).
export const LoginPage = lazy(() =>
  import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
export const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
export const ComponentShowcasePage = lazy(() =>
  import('@/pages/ComponentShowcasePage').then((m) => ({ default: m.ComponentShowcasePage })),
);
export const UsersPage = lazy(() =>
  import('@/pages/UsersPage').then((m) => ({ default: m.UsersPage })),
);
export const RolesPage = lazy(() =>
  import('@/pages/RolesPage').then((m) => ({ default: m.RolesPage })),
);
export const AccountPage = lazy(() =>
  import('@/pages/AccountPage').then((m) => ({ default: m.AccountPage })),
);

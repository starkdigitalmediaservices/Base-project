/** Every client-side path in one place. Never hard-code paths in components. */
export const ROUTES = {
  root: '/',
  login: '/login',
  dashboard: '/dashboard',
  components: '/components',
  users: '/admin/users',
  roles: '/admin/roles',
  account: '/account',
  unauthorized: '/unauthorized',
} as const;

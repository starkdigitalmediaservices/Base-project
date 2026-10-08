import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

import { ToastProvider } from '@/components/feedback/ToastProvider';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { CurrentUser } from '@/types/auth';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
}

/** Renders with theme, React Query and toast providers (no router, no auth). */
export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
    ...options
  }: RenderOptions & { queryClient?: QueryClient } = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>{children}</ToastProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );
  }
  return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
}

export function makeCurrentUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 1,
    name: 'Ada Admin',
    email: 'admin@example.com',
    is_active: true,
    role: { id: 1, name: 'admin' },
    permissions: ['users:read', 'users:write', 'roles:read', 'roles:write', 'audit_logs:read'],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

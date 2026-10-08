import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

import { authService } from '@/services/authService';
import { sessionStore } from '@/services/sessionStore';
import type { CurrentUser, LoginInput } from '@/types/auth';

import { AuthContext, type AuthContextValue } from './authContext';
import { type Permission, userHasPermission } from './permissions';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Owns the client-side session lifecycle:
 * - on start-up, silently calls POST /auth/refresh (httpOnly cookie) to restore the session;
 * - login stores the short-lived access token in memory;
 * - logout revokes the refresh token server-side and clears cached server state.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const session = useSyncExternalStore(sessionStore.subscribe, sessionStore.getState);

  useEffect(() => {
    if (sessionStore.getState().status !== 'initializing') return;
    // Concurrent calls (e.g. React StrictMode double effects) share one in-flight refresh.
    authService.refresh().catch(() => {
      if (sessionStore.getState().status === 'initializing') {
        sessionStore.clear('none');
      }
    });
  }, []);

  const login = useCallback(
    async (input: LoginInput) => {
      const tokens = await authService.login(input);
      queryClient.clear();
      sessionStore.setSession(tokens.access_token, tokens.user);
      return tokens.user;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Even if the server call fails, forget the local session.
    } finally {
      sessionStore.clear('logout');
      queryClient.clear();
    }
  }, [queryClient]);

  const updateUser = useCallback((user: CurrentUser) => sessionStore.setUser(user), []);

  const hasPermission = useCallback(
    (permission?: Permission) => userHasPermission(session.user?.permissions, permission),
    [session.user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status: session.status,
      user: session.user,
      isAuthenticated: session.status === 'authenticated',
      endReason: session.endReason,
      login,
      logout,
      updateUser,
      hasPermission,
    }),
    [session, login, logout, updateUser, hasPermission],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

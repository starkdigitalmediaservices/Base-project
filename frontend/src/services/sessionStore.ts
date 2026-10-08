import type { CurrentUser } from '@/types/auth';

export type SessionStatus = 'initializing' | 'authenticated' | 'anonymous';

/** Why the session ended — lets the login page explain an unexpected sign-out. */
export type SessionEndReason = 'none' | 'logout' | 'expired';

export interface SessionState {
  status: SessionStatus;
  /** Short-lived access token, kept in memory only (never localStorage). */
  accessToken: string | null;
  user: CurrentUser | null;
  endReason: SessionEndReason;
}

const INITIAL_STATE: SessionState = {
  status: 'initializing',
  accessToken: null,
  user: null,
  endReason: 'none',
};

let state: SessionState = INITIAL_STATE;
const listeners = new Set<() => void>();

function setState(next: SessionState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

/**
 * Tiny external store for the auth session, read by React through useSyncExternalStore and by the
 * API client without React. The refresh token itself is an httpOnly cookie that JS cannot read.
 */
export const sessionStore = {
  getState: (): SessionState => state,
  getAccessToken: (): string | null => state.accessToken,
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setSession: (accessToken: string, user: CurrentUser): void => {
    setState({ status: 'authenticated', accessToken, user, endReason: 'none' });
  },
  setUser: (user: CurrentUser): void => {
    if (state.status === 'authenticated') {
      setState({ ...state, user });
    }
  },
  clear: (endReason: SessionEndReason = 'none'): void => {
    setState({ status: 'anonymous', accessToken: null, user: null, endReason });
  },
  /** Test helper: return to the pre-bootstrap state. */
  reset: (): void => {
    setState(INITIAL_STATE);
  },
};

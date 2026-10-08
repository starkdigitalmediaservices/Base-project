import { createContext } from 'react';

import type { SessionEndReason, SessionStatus } from '@/services/sessionStore';
import type { CurrentUser, LoginInput } from '@/types/auth';

import type { Permission } from './permissions';

export interface AuthContextValue {
  status: SessionStatus;
  user: CurrentUser | null;
  isAuthenticated: boolean;
  endReason: SessionEndReason;
  login: (input: LoginInput) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  /** Replace the cached current user after a profile update. */
  updateUser: (user: CurrentUser) => void;
  hasPermission: (permission?: Permission) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

import type {
  ChangePasswordInput,
  CurrentUser,
  LoginInput,
  TokenResponse,
  UpdateProfileInput,
} from '@/types/auth';

import { apiClient, refreshSession } from './apiClient';

export const authService = {
  login: (input: LoginInput) =>
    apiClient.post<TokenResponse>('/auth/login', input, { skipAuth: true }),
  /** Restores/rotates the session using the httpOnly refresh cookie. */
  refresh: () => refreshSession(),
  logout: () => apiClient.post<void>('/auth/logout', undefined, { skipAuth: true }),
  me: (signal?: AbortSignal) => apiClient.get<CurrentUser>('/auth/me', { signal }),
  updateProfile: (input: UpdateProfileInput) => apiClient.patch<CurrentUser>('/auth/me', input),
  changePassword: (input: ChangePasswordInput) => apiClient.post<void>('/auth/me/password', input),
};

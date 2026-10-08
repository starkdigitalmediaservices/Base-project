import type { Page } from '@/types/api';
import type { User, UserCreateInput, UserListParams, UserUpdateInput } from '@/types/user';

import { apiClient } from './apiClient';

export const usersService = {
  /** Fetches ONE page of users; filtering, sorting and pagination happen in the database. */
  list: (params: UserListParams, signal?: AbortSignal) =>
    apiClient.get<Page<User>>('/users', { params: { ...params }, signal }),
  get: (id: number, signal?: AbortSignal) => apiClient.get<User>(`/users/${id}`, { signal }),
  create: (input: UserCreateInput) => apiClient.post<User>('/users', input),
  update: (id: number, input: UserUpdateInput) => apiClient.patch<User>(`/users/${id}`, input),
};

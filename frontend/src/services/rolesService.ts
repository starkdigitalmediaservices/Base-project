import type { Page } from '@/types/api';
import type { Role, RoleCreateInput, RoleListParams, RoleUpdateInput } from '@/types/role';

import { apiClient } from './apiClient';

export const rolesService = {
  /** Fetches ONE page of roles (max page_size is enforced by the backend). */
  list: (params: RoleListParams, signal?: AbortSignal) =>
    apiClient.get<Page<Role>>('/roles', { params: { ...params }, signal }),
  get: (id: number, signal?: AbortSignal) => apiClient.get<Role>(`/roles/${id}`, { signal }),
  create: (input: RoleCreateInput) => apiClient.post<Role>('/roles', input),
  update: (id: number, input: RoleUpdateInput) => apiClient.patch<Role>(`/roles/${id}`, input),
  remove: (id: number) => apiClient.delete(`/roles/${id}`),
};

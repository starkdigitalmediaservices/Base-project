import type { RoleListParams } from '@/types/role';
import type { UserListParams } from '@/types/user';

/** Central query-key factory so invalidation stays consistent across features. */
export const queryKeys = {
  users: {
    all: ['users'] as const,
    list: (params: UserListParams) => ['users', 'list', params] as const,
    detail: (id: number) => ['users', 'detail', id] as const,
  },
  roles: {
    all: ['roles'] as const,
    list: (params: RoleListParams) => ['roles', 'list', params] as const,
    detail: (id: number) => ['roles', 'detail', id] as const,
  },
};

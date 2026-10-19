import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { queryKeys } from '@/services/queryKeys';
import { rolesService } from '@/services/rolesService';
import { usersService } from '@/services/usersService';
import type { User, UserCreateInput, UserListParams, UserUpdateInput } from '@/types/user';

/** One page of users from GET /users (database-level pagination). */
export function useUsersList(params: UserListParams) {
  return usePaginatedQuery(['users', 'list'], params, usersService.list);
}

const ROLE_OPTIONS_PARAMS = {
  page: 1,
  page_size: 100,
  sort_by: 'name',
  sort_order: 'asc',
} as const;

/**
 * Role options for selects. Roles are a small set, so one page at the API maximum (100) is enough;
 * switch to an async/searchable select if you ever expect more roles than that.
 */
export function useRoleOptions() {
  return useQuery({
    queryKey: queryKeys.roles.list(ROLE_OPTIONS_PARAMS),
    queryFn: ({ signal }) => rolesService.list(ROLE_OPTIONS_PARAMS, signal),
    select: (page) => page.items.map((role) => ({ value: String(role.id), label: role.name })),
    staleTime: 5 * 60_000,
  });
}

function useInvalidateUserData() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
      // Role user counts change when users are created or re-assigned.
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all }),
    ]);
}

export function useCreateUser() {
  const invalidate = useInvalidateUserData();
  return useMutation({
    mutationFn: (input: UserCreateInput) => usersService.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateUser() {
  const invalidate = useInvalidateUserData();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UserUpdateInput }) =>
      usersService.update(id, input),
    onSuccess: invalidate,
  });
}

export function useSetUsersActive() {
  const invalidate = useInvalidateUserData();
  return useMutation({
    mutationFn: ({ users, isActive }: { users: User[]; isActive: boolean }) =>
      usersService.bulkSetActive({ user_ids: users.map((u) => u.id), is_active: isActive }),
    onSuccess: invalidate,
  });
}

export function useDeleteUser() {
  const invalidate = useInvalidateUserData();
  return useMutation({
    mutationFn: (id: number) => usersService.delete(id),
    onSuccess: invalidate,
  });
}

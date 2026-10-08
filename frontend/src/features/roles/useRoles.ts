import { useMutation, useQueryClient } from '@tanstack/react-query';

import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { queryKeys } from '@/services/queryKeys';
import { rolesService } from '@/services/rolesService';
import type { RoleCreateInput, RoleListParams, RoleUpdateInput } from '@/types/role';

/** One page of roles from GET /roles. */
export function useRolesList(params: RoleListParams) {
  return usePaginatedQuery(['roles', 'list'], params, rolesService.list);
}

function useInvalidateRoles() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
}

export function useCreateRole() {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: (input: RoleCreateInput) => rolesService.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: RoleUpdateInput }) =>
      rolesService.update(id, input),
    // Role names are shown in the users table too.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.roles.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
      ]),
  });
}

export function useDeleteRole() {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: (id: number) => rolesService.remove(id),
    onSuccess: invalidate,
  });
}

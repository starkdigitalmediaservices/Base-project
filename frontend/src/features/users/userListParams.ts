import { type DataTableState, toPageQuery } from '@/components/data-table';
import type { UserListParams, UserSortKey } from '@/types/user';

/** Maps generic table state to typed GET /users query params. */
export function toUserListParams(state: DataTableState): UserListParams {
  const base = toPageQuery(state);
  const roleId = state.filters.role_id;
  const isActive = state.filters.is_active;
  return {
    ...base,
    sort_by: base.sort_by as UserSortKey | undefined,
    role_id: roleId ? Number(roleId) : undefined,
    is_active: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
  };
}

import type { DataTableColumn } from '@/components/data-table';
import type { Role } from '@/types/role';
import { formatDate, formatNumber } from '@/utils/format';

export function buildRoleColumns(): DataTableColumn<Role>[] {
  return [
    {
      id: 'name',
      header: 'Name',
      sortKey: 'name',
      cell: (role) => (
        <span className="d-inline-flex align-items-center gap-2">
          <code>{role.name}</code>
          {role.is_system && <span className="badge text-bg-secondary">System</span>}
        </span>
      ),
      exportValue: (role) => role.name,
    },
    {
      id: 'description',
      header: 'Description',
      cell: (role) => role.description ?? <span className="text-body-secondary">—</span>,
      exportValue: (role) => role.description,
    },
    {
      id: 'user_count',
      header: 'Users',
      align: 'end',
      cell: (role) => formatNumber(role.user_count),
      exportValue: (role) => role.user_count,
    },
    {
      id: 'created_at',
      header: 'Created',
      sortKey: 'created_at',
      cell: (role) => <time dateTime={role.created_at}>{formatDate(role.created_at)}</time>,
      exportValue: (role) => role.created_at,
    },
  ];
}

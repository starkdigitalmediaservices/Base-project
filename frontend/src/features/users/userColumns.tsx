import type { DataTableColumn } from '@/components/data-table';
import type { SelectOption } from '@/components/forms/SelectField';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { User } from '@/types/user';
import { formatDate } from '@/utils/format';

import styles from './UsersTable.module.css';

const STATUS_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
] as const;

/** Column definitions for the users table. Sort keys/filter keys match the API query params. */
export function buildUserColumns(
  roleOptions: readonly SelectOption[],
  currentUserId: number | undefined,
): DataTableColumn<User>[] {
  return [
    {
      id: 'name',
      header: 'Name',
      sortKey: 'name',
      cell: (user) => (
        <span className={styles.nameCell}>
          <Avatar name={user.name} size="sm" decorative />
          <span className={styles.name}>{user.name}</span>
          {user.id === currentUserId && <span className="badge text-bg-info">You</span>}
        </span>
      ),
      exportValue: (user) => user.name,
    },
    {
      id: 'email',
      header: 'Email',
      sortKey: 'email',
      cell: (user) => <span className={styles.email}>{user.email}</span>,
      exportValue: (user) => user.email,
    },
    {
      id: 'role',
      header: 'Role',
      cell: (user) => <span className="badge text-bg-secondary">{user.role.name}</span>,
      filter: {
        key: 'role_id',
        type: 'select',
        label: 'Role',
        placeholder: 'All roles',
        options: roleOptions,
      },
      exportValue: (user) => user.role.name,
    },
    {
      id: 'status',
      header: 'Status',
      cell: (user) => <StatusBadge status={user.is_active ? 'active' : 'inactive'} />,
      filter: {
        key: 'is_active',
        type: 'select',
        label: 'Status',
        placeholder: 'All statuses',
        options: STATUS_OPTIONS,
      },
      exportValue: (user) => (user.is_active ? 'Active' : 'Inactive'),
    },
    {
      id: 'created_at',
      header: 'Created',
      sortKey: 'created_at',
      cell: (user) => <time dateTime={user.created_at}>{formatDate(user.created_at)}</time>,
      exportValue: (user) => user.created_at,
    },
  ];
}

import { useMemo, useState } from 'react';

import { DataTable, type RowAction, useDataTableState } from '@/components/data-table';
import { useToast } from '@/components/feedback/useToast';
import { AppButton } from '@/components/ui/AppButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { PERMISSIONS } from '@/features/auth/permissions';
import { useAuth } from '@/features/auth/useAuth';
import { buildUserColumns } from '@/features/users/userColumns';
import { UserFormModal } from '@/features/users/UserFormModal';
import { toUserListParams } from '@/features/users/userListParams';
import { useRoleOptions, useSetUsersActive, useUsersList } from '@/features/users/useUsers';
import { useFormModal } from '@/hooks/useFormModal';
import { getErrorMessage } from '@/services/apiError';
import type { User } from '@/types/user';

const INITIAL_FILTERS = { role_id: '', is_active: '' };

interface StatusChange {
  users: User[];
  isActive: boolean;
}

/** Users administration: backend-paginated table with search, filters, sorting and CRUD actions. */
export function UsersPage() {
  const { user: currentUser, hasPermission, updateUser } = useAuth();
  const { showToast } = useToast();
  const canWrite = hasPermission(PERMISSIONS.USERS_WRITE);

  const controller = useDataTableState({ initialFilters: INITIAL_FILTERS });
  const params = useMemo(() => toUserListParams(controller.state), [controller.state]);
  const usersQuery = useUsersList(params);
  const roleOptionsQuery = useRoleOptions();
  const roleOptions = useMemo(() => roleOptionsQuery.data ?? [], [roleOptionsQuery.data]);

  const formModal = useFormModal<User>();
  const [statusChange, setStatusChange] = useState<StatusChange | null>(null);
  const setUsersActive = useSetUsersActive();

  const columns = useMemo(
    () => buildUserColumns(roleOptions, currentUser?.id),
    [roleOptions, currentUser?.id],
  );

  const rowActions = (user: User): RowAction<User>[] => {
    const isSelf = user.id === currentUser?.id;
    return [
      { id: 'edit', label: 'Edit', icon: 'pencil', hidden: !canWrite, onClick: formModal.openEdit },
      {
        id: 'toggle-status',
        label: user.is_active ? 'Deactivate' : 'Activate',
        icon: user.is_active ? 'person-x' : 'person-check',
        variant: user.is_active ? 'danger' : 'default',
        hidden: !canWrite,
        disabled: isSelf,
        onClick: () => setStatusChange({ users: [user], isActive: !user.is_active }),
      },
    ];
  };

  const handleSaved = (saved: User, mode: 'created' | 'updated') => {
    formModal.close();
    if (currentUser && saved.id === currentUser.id) {
      updateUser({ ...currentUser, ...saved, permissions: currentUser.permissions });
    }
    showToast({
      variant: 'success',
      message: mode === 'created' ? `User ${saved.name} created.` : `User ${saved.name} updated.`,
    });
  };

  const requestBulkDeactivate = (selected: User[]) => {
    const targets = selected.filter((user) => user.id !== currentUser?.id && user.is_active);
    if (targets.length === 0) {
      showToast({ variant: 'info', message: 'No active users (other than you) are selected.' });
      return;
    }
    setStatusChange({ users: targets, isActive: false });
  };

  const confirmStatusChange = async () => {
    if (!statusChange) return;
    try {
      const { succeeded, failed } = await setUsersActive.mutateAsync({
        users: statusChange.users,
        isActive: statusChange.isActive,
      });
      const verb = statusChange.isActive ? 'activated' : 'deactivated';
      if (succeeded.length > 0) {
        showToast({ variant: 'success', message: `${succeeded.length} user(s) ${verb}.` });
      }
      if (failed.length > 0) {
        showToast({
          variant: 'danger',
          message: `Could not update: ${failed.map((user) => user.name).join(', ')}.`,
        });
      }
    } catch (error) {
      showToast({ variant: 'danger', message: getErrorMessage(error) });
    } finally {
      setStatusChange(null);
    }
  };

  const statusTargetLabel =
    statusChange?.users.length === 1
      ? (statusChange.users[0]?.name ?? '')
      : `${statusChange?.users.length ?? 0} users`;

  return (
    <>
      <PageHeader
        title="Users"
        description="Search, filter and manage user accounts. Data is paginated by the API."
        actions={
          canWrite && (
            <AppButton icon="plus-lg" onClick={formModal.openCreate}>
              Create user
            </AppButton>
          )
        }
      />

      <DataTable
        caption="Users"
        columns={columns}
        data={usersQuery.data}
        controller={controller}
        getRowId={(user) => user.id}
        getRowLabel={(user) => user.name}
        isLoading={usersQuery.isPending}
        isFetching={usersQuery.isFetching}
        error={usersQuery.error}
        onRetry={() => void usersQuery.refetch()}
        searchLabel="Search users"
        searchPlaceholder="Search by name or email"
        selectable={canWrite}
        rowActions={canWrite ? rowActions : undefined}
        bulkActions={[
          {
            id: 'deactivate',
            label: 'Deactivate selected (demo)',
            icon: 'person-x',
            variant: 'outline-danger',
            onClick: requestBulkDeactivate,
          },
        ]}
        exportFileName="users"
        emptyTitle="No users yet"
        emptyDescription="Create the first user to get started."
        responsiveMode="stack"
      />

      <UserFormModal
        key={formModal.version}
        show={formModal.isOpen}
        onHide={formModal.close}
        user={formModal.item}
        roleOptions={roleOptions}
        isSelf={formModal.item?.id === currentUser?.id}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        show={statusChange !== null}
        title={statusChange?.isActive ? 'Activate user' : 'Deactivate user'}
        message={
          statusChange?.isActive
            ? `Activate ${statusTargetLabel}? They will be able to sign in again.`
            : `Deactivate ${statusTargetLabel}? They will no longer be able to sign in.`
        }
        confirmLabel={statusChange?.isActive ? 'Activate' : 'Deactivate'}
        variant={statusChange?.isActive ? 'primary' : 'danger'}
        isLoading={setUsersActive.isPending}
        onConfirm={() => void confirmStatusChange()}
        onCancel={() => setStatusChange(null)}
      />
    </>
  );
}

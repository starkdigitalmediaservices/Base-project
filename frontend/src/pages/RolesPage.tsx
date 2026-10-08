import { useMemo, useState } from 'react';

import { DataTable, type RowAction, toPageQuery, useDataTableState } from '@/components/data-table';
import { useToast } from '@/components/feedback/useToast';
import { AppButton } from '@/components/ui/AppButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { PERMISSIONS } from '@/features/auth/permissions';
import { useAuth } from '@/features/auth/useAuth';
import { buildRoleColumns } from '@/features/roles/roleColumns';
import { RoleFormModal } from '@/features/roles/RoleFormModal';
import { useDeleteRole, useRolesList } from '@/features/roles/useRoles';
import { useFormModal } from '@/hooks/useFormModal';
import { getErrorMessage } from '@/services/apiError';
import type { Role, RoleListParams, RoleSortKey } from '@/types/role';

const COLUMNS = buildRoleColumns();

/** Roles administration. Each user has exactly one role (users.role_id). */
export function RolesPage() {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const canWrite = hasPermission(PERMISSIONS.ROLES_WRITE);

  const controller = useDataTableState({ initialSort: { sortBy: 'name', sortOrder: 'asc' } });
  const params = useMemo<RoleListParams>(() => {
    const base = toPageQuery(controller.state);
    return { ...base, sort_by: base.sort_by as RoleSortKey | undefined };
  }, [controller.state]);
  const rolesQuery = useRolesList(params);

  const formModal = useFormModal<Role>();
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const deleteRole = useDeleteRole();

  const rowActions = (role: Role): RowAction<Role>[] => [
    { id: 'edit', label: 'Edit', icon: 'pencil', onClick: formModal.openEdit },
    {
      id: 'delete',
      label: role.is_system
        ? 'Delete (system role)'
        : role.user_count > 0
          ? 'Delete (role in use)'
          : 'Delete',
      icon: 'trash',
      variant: 'danger',
      disabled: role.is_system || role.user_count > 0,
      onClick: setRoleToDelete,
    },
  ];

  const handleDelete = async () => {
    if (!roleToDelete) return;
    try {
      await deleteRole.mutateAsync(roleToDelete.id);
      showToast({ variant: 'success', message: `Role ${roleToDelete.name} deleted.` });
    } catch (error) {
      showToast({ variant: 'danger', message: getErrorMessage(error) });
    } finally {
      setRoleToDelete(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Roles"
        description="Each user has exactly one role. System roles (admin, manager, user) are protected."
        actions={
          canWrite && (
            <AppButton icon="plus-lg" onClick={formModal.openCreate}>
              Create role
            </AppButton>
          )
        }
      />

      <DataTable
        caption="Roles"
        columns={COLUMNS}
        data={rolesQuery.data}
        controller={controller}
        getRowId={(role) => role.id}
        getRowLabel={(role) => role.name}
        isLoading={rolesQuery.isPending}
        isFetching={rolesQuery.isFetching}
        error={rolesQuery.error}
        onRetry={() => void rolesQuery.refetch()}
        searchLabel="Search roles"
        searchPlaceholder="Search by name or description"
        rowActions={canWrite ? rowActions : undefined}
        exportFileName="roles"
        emptyTitle="No roles found"
      />

      <RoleFormModal
        key={formModal.version}
        show={formModal.isOpen}
        onHide={formModal.close}
        role={formModal.item}
        onSaved={(role, mode) => {
          formModal.close();
          showToast({ variant: 'success', message: `Role ${role.name} ${mode}.` });
        }}
      />

      <ConfirmDialog
        show={roleToDelete !== null}
        title="Delete role"
        message={`Delete the role “${roleToDelete?.name ?? ''}”? This cannot be undone.`}
        confirmLabel="Delete role"
        isLoading={deleteRole.isPending}
        onConfirm={() => void handleDelete()}
        onCancel={() => setRoleToDelete(null)}
      />
    </>
  );
}

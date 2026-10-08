import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { FormErrorAlert } from '@/components/forms/FormErrorAlert';
import { TextAreaField } from '@/components/forms/TextAreaField';
import { TextField } from '@/components/forms/TextField';
import { AppButton } from '@/components/ui/AppButton';
import { AppModal } from '@/components/ui/AppModal';
import { ApiError } from '@/services/apiError';
import type { Role } from '@/types/role';
import { applyApiValidationErrors } from '@/utils/formErrors';

import { ROLE_FORM_FIELDS, type RoleFormValues, roleSchema } from './roleSchemas';
import { useCreateRole, useUpdateRole } from './useRoles';

interface RoleFormModalProps {
  show: boolean;
  onHide: () => void;
  role: Role | null;
  onSaved: (role: Role, mode: 'created' | 'updated') => void;
}

const FORM_ID = 'role-form';

export function RoleFormModal({ show, onHide, role, onSaved }: RoleFormModalProps) {
  const isEdit = role !== null;
  const isSystem = role?.is_system ?? false;
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: role?.name ?? '', description: role?.description ?? '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const description = values.description || null;
    try {
      if (role) {
        const input = isSystem ? { description } : { name: values.name, description };
        onSaved(await updateRole.mutateAsync({ id: role.id, input }), 'updated');
      } else {
        onSaved(await createRole.mutateAsync({ name: values.name, description }), 'created');
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setError('name', { type: 'server', message: error.message }, { shouldFocus: true });
        return;
      }
      setFormError(applyApiValidationErrors(error, setError, ROLE_FORM_FIELDS));
    }
  });

  return (
    <AppModal
      show={show}
      onHide={onHide}
      title={isEdit ? `Edit role “${role.name}”` : 'Create role'}
      staticBackdrop={isDirty || isSubmitting}
      footer={
        <>
          <AppButton variant="outline-secondary" onClick={onHide} disabled={isSubmitting}>
            Cancel
          </AppButton>
          <AppButton type="submit" form={FORM_ID} isLoading={isSubmitting} loadingText="Saving…">
            {isEdit ? 'Save changes' : 'Create role'}
          </AppButton>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate>
        <FormErrorAlert message={formError} />
        <TextField
          label="Name"
          required
          readOnly={isSystem}
          autoComplete="off"
          helpText={
            isSystem
              ? 'System roles cannot be renamed.'
              : 'Lowercase letters, numbers and underscores (e.g. support_agent).'
          }
          error={errors.name?.message}
          {...register('name')}
        />
        <TextAreaField
          label="Description"
          rows={3}
          error={errors.description?.message}
          {...register('description')}
        />
      </form>
    </AppModal>
  );
}

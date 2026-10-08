import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { CheckboxField } from '@/components/forms/CheckboxField';
import { FormErrorAlert } from '@/components/forms/FormErrorAlert';
import { SelectField, type SelectOption } from '@/components/forms/SelectField';
import { TextField } from '@/components/forms/TextField';
import { AppButton } from '@/components/ui/AppButton';
import { AppModal } from '@/components/ui/AppModal';
import { ApiError } from '@/services/apiError';
import type { User, UserUpdateInput } from '@/types/user';
import { applyApiValidationErrors } from '@/utils/formErrors';

import { useCreateUser, useUpdateUser } from './useUsers';
import {
  USER_FORM_FIELDS,
  userCreateSchema,
  userEditSchema,
  type UserFormValues,
} from './userSchemas';

interface UserFormModalProps {
  show: boolean;
  onHide: () => void;
  /** User to edit; omit to create a new user. */
  user: User | null;
  roleOptions: readonly SelectOption[];
  /** True when editing the signed-in user (role and status are locked). */
  isSelf: boolean;
  onSaved: (user: User, mode: 'created' | 'updated') => void;
}

const FORM_ID = 'user-form';

export function UserFormModal({
  show,
  onHide,
  user,
  roleOptions,
  isSelf,
  onSaved,
}: UserFormModalProps) {
  const isEdit = user !== null;
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UserFormValues>({
    resolver: zodResolver(isEdit ? userEditSchema : userCreateSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      password: '',
      role_id: user ? String(user.role.id) : '',
      is_active: user?.is_active ?? true,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (user) {
        const input: UserUpdateInput = {
          name: values.name,
          email: values.email,
          ...(values.password ? { password: values.password } : {}),
          ...(isSelf ? {} : { role_id: Number(values.role_id), is_active: values.is_active }),
        };
        onSaved(await updateUser.mutateAsync({ id: user.id, input }), 'updated');
      } else {
        const created = await createUser.mutateAsync({
          name: values.name,
          email: values.email,
          password: values.password,
          role_id: Number(values.role_id),
          is_active: values.is_active,
        });
        onSaved(created, 'created');
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setError('email', { type: 'server', message: error.message }, { shouldFocus: true });
        return;
      }
      setFormError(applyApiValidationErrors(error, setError, USER_FORM_FIELDS));
    }
  });

  return (
    <AppModal
      show={show}
      onHide={onHide}
      title={isEdit ? `Edit ${user.name}` : 'Create user'}
      staticBackdrop={isDirty || isSubmitting}
      fullscreenOnMobile
      footer={
        <>
          <AppButton variant="outline-secondary" onClick={onHide} disabled={isSubmitting}>
            Cancel
          </AppButton>
          <AppButton type="submit" form={FORM_ID} isLoading={isSubmitting} loadingText="Saving…">
            {isEdit ? 'Save changes' : 'Create user'}
          </AppButton>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate>
        <FormErrorAlert message={formError} />
        <TextField
          label="Full name"
          required
          autoComplete="off"
          error={errors.name?.message}
          {...register('name')}
        />
        <TextField
          label="Email"
          type="email"
          required
          autoComplete="off"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label={isEdit ? 'New password' : 'Password'}
          type="password"
          required={!isEdit}
          autoComplete="new-password"
          helpText={
            isEdit
              ? 'Leave blank to keep the current password. 8–128 characters.'
              : '8–128 characters.'
          }
          error={errors.password?.message}
          {...register('password')}
        />
        <SelectField
          label="Role"
          required
          placeholder="Select a role"
          options={roleOptions}
          disabled={isSelf}
          helpText={isSelf ? 'You cannot change your own role.' : undefined}
          error={errors.role_id?.message}
          {...register('role_id')}
        />
        <CheckboxField
          switch
          label="Active (can sign in)"
          disabled={isSelf}
          helpText={isSelf ? 'You cannot deactivate your own account.' : undefined}
          error={errors.is_active?.message}
          {...register('is_active')}
        />
      </form>
    </AppModal>
  );
}

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { useToast } from '@/components/feedback/useToast';
import { FormErrorAlert } from '@/components/forms/FormErrorAlert';
import { TextField } from '@/components/forms/TextField';
import { AppButton } from '@/components/ui/AppButton';
import { useAuth } from '@/features/auth/useAuth';
import { authService } from '@/services/authService';
import type { CurrentUser } from '@/types/auth';
import { applyApiValidationErrors } from '@/utils/formErrors';

import { profileSchema, type ProfileValues } from './accountSchemas';

/** Updates the signed-in user's display name (PATCH /auth/me). Email and role are read-only. */
export function ProfileForm({ user }: { user: CurrentUser }) {
  const { updateUser } = useAuth();
  const { showToast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const updated = await authService.updateProfile(values);
      updateUser(updated);
      reset({ name: updated.name });
      showToast({ variant: 'success', message: 'Profile updated.' });
    } catch (error) {
      setFormError(applyApiValidationErrors(error, setError, ['name']));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FormErrorAlert message={formError} />
      <TextField
        label="Full name"
        required
        autoComplete="name"
        error={errors.name?.message}
        {...register('name')}
      />
      <TextField
        label="Email"
        type="email"
        value={user.email}
        readOnly
        helpText="Contact an administrator to change your email address."
      />
      <TextField label="Role" value={user.role.name} readOnly />
      <AppButton type="submit" isLoading={isSubmitting} loadingText="Saving…" disabled={!isDirty}>
        Save profile
      </AppButton>
    </form>
  );
}

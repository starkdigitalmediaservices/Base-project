import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { useToast } from '@/components/feedback/useToast';
import { FormErrorAlert } from '@/components/forms/FormErrorAlert';
import { TextField } from '@/components/forms/TextField';
import { AppButton } from '@/components/ui/AppButton';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/services/apiError';
import { authService } from '@/services/authService';
import type { CurrentUser } from '@/types/auth';
import { applyApiValidationErrors } from '@/utils/formErrors';

import { profileSchema, type ProfileValues } from './accountSchemas';

/** Updates the signed-in user's display name and email (PATCH /auth/me). */
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
    defaultValues: { name: user.name, email: user.email },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const updated = await authService.updateProfile({
        name: values.name,
        // Only send email when the user actually changed it.
        ...(values.email !== user.email ? { email: values.email } : {}),
      });
      updateUser(updated);
      reset({ name: updated.name, email: updated.email });
      showToast({ variant: 'success', message: 'Profile updated.' });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setError('email', { type: 'server', message: error.message }, { shouldFocus: true });
        return;
      }
      setFormError(applyApiValidationErrors(error, setError, ['name', 'email']));
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
        required
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <TextField label="Role" value={user.role.name} readOnly />
      <AppButton type="submit" isLoading={isSubmitting} loadingText="Saving…" disabled={!isDirty}>
        Save profile
      </AppButton>
    </form>
  );
}

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { useToast } from '@/components/feedback/useToast';
import { FormErrorAlert } from '@/components/forms/FormErrorAlert';
import { TextField } from '@/components/forms/TextField';
import { AppButton } from '@/components/ui/AppButton';
import { ApiError } from '@/services/apiError';
import { authService } from '@/services/authService';
import { applyApiValidationErrors } from '@/utils/formErrors';

import { type ChangePasswordValues, changePasswordSchema } from './accountSchemas';

/** POST /auth/me/password. The backend revokes the user's other sessions on success. */
export function ChangePasswordForm() {
  const { showToast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
  });

  const onSubmit = handleSubmit(async ({ current_password, new_password }) => {
    setFormError(null);
    try {
      await authService.changePassword({ current_password, new_password });
      reset();
      showToast({
        variant: 'success',
        message: 'Password changed. Other signed-in sessions have been signed out.',
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setError(
          'current_password',
          { type: 'server', message: error.message },
          { shouldFocus: true },
        );
        return;
      }
      setFormError(applyApiValidationErrors(error, setError, ['current_password', 'new_password']));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FormErrorAlert message={formError} />
      <TextField
        label="Current password"
        type="password"
        required
        autoComplete="current-password"
        error={errors.current_password?.message}
        {...register('current_password')}
      />
      <TextField
        label="New password"
        type="password"
        required
        autoComplete="new-password"
        helpText="8–128 characters."
        error={errors.new_password?.message}
        {...register('new_password')}
      />
      <TextField
        label="Confirm new password"
        type="password"
        required
        autoComplete="new-password"
        error={errors.confirm_password?.message}
        {...register('confirm_password')}
      />
      <AppButton type="submit" isLoading={isSubmitting} loadingText="Updating…">
        Change password
      </AppButton>
    </form>
  );
}

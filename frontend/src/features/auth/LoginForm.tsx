import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import { useForm } from 'react-hook-form';

import { FormErrorAlert } from '@/components/forms/FormErrorAlert';
import { TextField } from '@/components/forms/TextField';
import { AppButton } from '@/components/ui/AppButton';
import { applyApiValidationErrors } from '@/utils/formErrors';

import { loginSchema, type LoginValues } from './loginSchema';
import { useAuth } from './useAuth';

/** Email/password sign-in. On success PublicOnlyRoute redirects to the originally requested page. */
export function LoginForm() {
  const { login, endReason } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
    } catch (error) {
      setFormError(applyApiValidationErrors(error, setError, ['email', 'password']));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate aria-describedby="login-help">
      {endReason === 'expired' && !formError && (
        <Alert variant="warning" role="status">
          Your session has expired. Please sign in again.
        </Alert>
      )}
      <FormErrorAlert message={formError} title="Sign-in failed" />
      <TextField
        label="Email"
        type="email"
        autoComplete="username"
        autoFocus
        required
        error={errors.email?.message}
        {...register('email')}
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        error={errors.password?.message}
        {...register('password')}
      />
      <AppButton type="submit" className="w-100" isLoading={isSubmitting} loadingText="Signing in…">
        Sign in
      </AppButton>
      <p id="login-help" className="form-text mt-3 mb-0">
        <span className="badge text-bg-info me-1">Demo</span>
        Local development admin: <code>admin@example.com</code> with the password set as{' '}
        <code>FIRST_ADMIN_PASSWORD</code> in <code>backend/.env</code>. Change it before any
        deployment.
      </p>
    </form>
  );
}

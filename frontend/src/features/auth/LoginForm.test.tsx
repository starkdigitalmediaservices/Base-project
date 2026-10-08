import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/services/apiError';
import { makeCurrentUser, renderWithProviders } from '@/test/testUtils';

import { AuthContext, type AuthContextValue } from './authContext';
import { LoginForm } from './LoginForm';

function renderLogin(
  login: AuthContextValue['login'],
  endReason: AuthContextValue['endReason'] = 'none',
) {
  const value: AuthContextValue = {
    status: 'anonymous',
    user: null,
    isAuthenticated: false,
    endReason,
    login,
    logout: vi.fn(),
    updateUser: vi.fn(),
    hasPermission: () => false,
  };
  return renderWithProviders(
    <AuthContext value={value}>
      <LoginForm />
    </AuthContext>,
  );
}

describe('LoginForm', () => {
  it('validates fields on the client before calling the API', async () => {
    const user = userEvent.setup();
    const login = vi.fn();
    renderLogin(login);

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toHaveAttribute('aria-invalid', 'true');
    expect(login).not.toHaveBeenCalled();
  });

  it('submits valid credentials', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue(makeCurrentUser());
    renderLogin(login);

    await user.type(screen.getByLabelText(/Email/), 'admin@example.com');
    await user.type(screen.getByLabelText(/Password/), 'secret-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(login).toHaveBeenCalledWith({ email: 'admin@example.com', password: 'secret-password' });
  });

  it('shows API errors as a form-level alert', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockRejectedValue(
      new ApiError({
        status: 401,
        code: 'invalid_credentials',
        message: 'Incorrect email or password.',
      }),
    );
    renderLogin(login);

    await user.type(screen.getByLabelText(/Email/), 'admin@example.com');
    await user.type(screen.getByLabelText(/Password/), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.');
  });

  it('maps FastAPI validation errors onto fields', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockRejectedValue(
      new ApiError({
        status: 422,
        code: 'validation_error',
        message: 'Some fields are invalid.',
        details: [
          {
            field: 'email',
            loc: ['body', 'email'],
            message: 'Email domain is not allowed.',
            type: 'value_error',
          },
        ],
      }),
    );
    renderLogin(login);

    await user.type(screen.getByLabelText(/Email/), 'admin@example.com');
    await user.type(screen.getByLabelText(/Password/), 'whatever');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Email domain is not allowed.')).toBeInTheDocument();
  });

  it('explains an expired session', () => {
    renderLogin(vi.fn(), 'expired');
    expect(screen.getByText('Your session has expired. Please sign in again.')).toBeInTheDocument();
  });
});

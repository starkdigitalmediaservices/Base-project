import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/services/apiError';

import { applyApiValidationErrors } from './formErrors';

type Values = { name: string; email: string };

describe('applyApiValidationErrors', () => {
  it('maps known fields onto the form and focuses the first one', () => {
    const setError = vi.fn();
    const error = new ApiError({
      status: 422,
      code: 'validation_error',
      message: 'Some fields are invalid.',
      details: [
        { field: 'email', loc: ['body', 'email'], message: 'Invalid email', type: 'value_error' },
        { field: 'name', loc: ['body', 'name'], message: 'Too short', type: 'string_too_short' },
      ],
    });

    const formMessage = applyApiValidationErrors<Values>(error, setError, ['name', 'email']);

    expect(formMessage).toBeNull();
    expect(setError).toHaveBeenNthCalledWith(
      1,
      'email',
      { type: 'server', message: 'Invalid email' },
      { shouldFocus: true },
    );
    expect(setError).toHaveBeenNthCalledWith(
      2,
      'name',
      { type: 'server', message: 'Too short' },
      { shouldFocus: false },
    );
  });

  it('returns unknown fields as a form-level message', () => {
    const setError = vi.fn();
    const error = new ApiError({
      status: 422,
      code: 'validation_error',
      message: 'Some fields are invalid.',
      details: [
        { field: 'tenant_id', loc: ['body', 'tenant_id'], message: 'Required', type: 'missing' },
      ],
    });

    expect(applyApiValidationErrors<Values>(error, setError, ['name', 'email'])).toBe(
      'tenant_id: Required',
    );
    expect(setError).not.toHaveBeenCalled();
  });

  it('returns the API message for non-validation errors', () => {
    const error = new ApiError({
      status: 409,
      code: 'conflict',
      message: 'Email already registered.',
    });
    expect(applyApiValidationErrors<Values>(error, vi.fn(), ['email'])).toBe(
      'Email already registered.',
    );
  });

  it('handles unexpected errors', () => {
    expect(applyApiValidationErrors<Values>(new Error('Boom'), vi.fn(), ['email'])).toBe('Boom');
    expect(applyApiValidationErrors<Values>('weird', vi.fn(), ['email'])).toBe(
      'Something went wrong. Please try again.',
    );
  });
});

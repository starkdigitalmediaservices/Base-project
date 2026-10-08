import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { ApiError } from '@/services/apiError';

const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Maps a FastAPI validation error (422, `error.details[].field`) onto react-hook-form fields.
 *
 * Returns a form-level message for anything that cannot be attached to a known field (unknown
 * fields, non-validation errors, network failures), or null when every problem was mapped.
 */
export function applyApiValidationErrors<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>,
  knownFields: readonly Path<TFieldValues>[],
): string | null {
  if (!(error instanceof ApiError)) {
    return error instanceof Error && error.message ? error.message : GENERIC_MESSAGE;
  }
  if (!error.isValidationError || !error.details?.length) {
    return error.message || GENERIC_MESSAGE;
  }

  const unmapped: string[] = [];
  let focused = false;
  for (const detail of error.details) {
    const field = detail.field as Path<TFieldValues> | null;
    if (field && knownFields.includes(field)) {
      setError(field, { type: 'server', message: detail.message }, { shouldFocus: !focused });
      focused = true;
    } else {
      unmapped.push(detail.field ? `${detail.field}: ${detail.message}` : detail.message);
    }
  }
  return unmapped.length > 0 ? unmapped.join(' ') : null;
}

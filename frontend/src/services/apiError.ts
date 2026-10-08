import type { ApiErrorBody, ApiErrorDetail } from '@/types/api';

interface ApiErrorInit {
  status: number;
  code: string;
  message: string;
  details?: ApiErrorDetail[] | null;
  requestId?: string | null;
}

const FALLBACK_MESSAGES: Record<number, string> = {
  400: 'The request could not be processed.',
  401: 'Your session is not valid. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'The request conflicts with the current state of the resource.',
  422: 'Some fields are invalid.',
  429: 'Too many requests. Please wait and try again.',
  500: 'An unexpected server error occurred.',
  503: 'The service is temporarily unavailable.',
};

/** Typed error for every failed API call (HTTP errors, network failures and timeouts). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorDetail[] | null;
  readonly requestId: string | null;

  constructor({ status, code, message, details = null, requestId = null }: ApiErrorInit) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }

  get isValidationError(): boolean {
    return this.code === 'validation_error';
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  /** Builds an ApiError from a non-2xx response, tolerating non-JSON or unexpected bodies. */
  static async fromResponse(response: Response): Promise<ApiError> {
    const fallback =
      FALLBACK_MESSAGES[response.status] ?? `Request failed with status ${response.status}.`;
    let payload: unknown;
    try {
      const text = await response.text();
      payload = text ? (JSON.parse(text) as unknown) : null;
    } catch {
      payload = null;
    }

    if (isErrorEnvelope(payload)) {
      const { code, message, details, request_id: requestId } = payload.error;
      return new ApiError({
        status: response.status,
        code,
        message: message || fallback,
        details,
        requestId: requestId ?? response.headers.get('x-request-id'),
      });
    }

    return new ApiError({
      status: response.status,
      code: `http_${response.status}`,
      message: fallback,
      requestId: response.headers.get('x-request-id'),
    });
  }
}

function isErrorEnvelope(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const error = value.error;
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  );
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Human-readable message for any thrown value. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

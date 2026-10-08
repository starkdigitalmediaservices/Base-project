import type { TokenResponse } from '@/types/auth';
import { env } from '@/utils/env';
import { buildQueryString } from '@/utils/queryString';

import { ApiError } from './apiError';
import { sessionStore } from './sessionStore';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type QueryParams = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions {
  method?: HttpMethod;
  /** JSON-serialisable body, or FormData for uploads. */
  body?: unknown;
  params?: QueryParams;
  headers?: Record<string, string>;
  /** Caller cancellation (React Query passes one to every queryFn). */
  signal?: AbortSignal;
  timeoutMs?: number;
  /**
   * Skip the bearer token and the automatic 401 → refresh → retry cycle. Used by the auth
   * endpoints themselves (login, refresh, logout).
   */
  skipAuth?: boolean;
}

const REFRESH_PATH = '/auth/refresh';
/** Web Locks name that serialises refreshes across browser tabs of this origin. */
export const REFRESH_LOCK_NAME = 'base-project:auth-refresh';

let refreshInFlight: Promise<TokenResponse> | null = null;

function buildUrl(path: string, params?: QueryParams): string {
  const normalisedPath = path.startsWith('/') ? path : `/${path}`;
  return `${env.apiBaseUrl}${normalisedPath}${params ? buildQueryString(params) : ''}`;
}

/** Combines several abort signals (AbortSignal.any is not available in every supported browser). */
function combineSignals(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const headers = new Headers({ Accept: 'application/json', ...options.headers });
  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }

  const accessToken = sessionStore.getAccessToken();
  if (accessToken && !options.skipAuth) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), options.timeoutMs ?? env.apiTimeoutMs);
  const signal = options.signal
    ? combineSignals([options.signal, timeoutController.signal])
    : timeoutController.signal;

  try {
    return await fetch(buildUrl(path, options.params), {
      method: options.method ?? 'GET',
      headers,
      body,
      signal,
      // Sends the httpOnly refresh-token cookie to /auth/* endpoints.
      credentials: 'include',
    });
  } catch (error) {
    if (options.signal?.aborted) {
      throw error; // Caller cancelled (e.g. React Query): propagate the AbortError untouched.
    }
    if (timeoutController.signal.aborted) {
      throw new ApiError({
        status: 0,
        code: 'timeout',
        message: 'The server took too long to respond. Please try again.',
      });
    }
    throw new ApiError({
      status: 0,
      code: 'network_error',
      message: 'Unable to reach the server. Check your connection and try again.',
    });
  } finally {
    clearTimeout(timer);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await ApiError.fromResponse(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

function expireSession(): void {
  const wasAuthenticated = sessionStore.getState().status === 'authenticated';
  sessionStore.clear(wasAuthenticated ? 'expired' : 'none');
}

/**
 * Runs the task while holding a cross-tab lock (Web Locks API) when the browser supports it.
 * Without it, two tabs refreshing at the same moment would present the same single-use refresh
 * token; the second tab now waits and then sends the cookie the first tab just rotated.
 */
function withCrossTabLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator === 'undefined' || !('locks' in navigator)) {
    return task();
  }
  return navigator.locks.request(REFRESH_LOCK_NAME, task);
}

/**
 * Exchanges the refresh-token cookie for a new access token. Concurrent callers in this tab share
 * one in-flight request and other tabs are serialised via a Web Lock, so the rotating refresh
 * token is only used once.
 */
export function refreshSession(): Promise<TokenResponse> {
  refreshInFlight ??= withCrossTabLock(() =>
    request<TokenResponse>(REFRESH_PATH, { method: 'POST', skipAuth: true }),
  )
    .then((tokens) => {
      sessionStore.setSession(tokens.access_token, tokens.user);
      return tokens;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

/** Performs an API request and returns the parsed JSON body (or undefined for 204). */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options);

  if (response.status !== 401 || options.skipAuth) {
    return parseResponse<T>(response);
  }

  // Access token missing/expired: refresh once, then retry the original request once.
  const originalError = await ApiError.fromResponse(response);
  try {
    await refreshSession();
  } catch {
    expireSession();
    throw originalError;
  }

  const retried = await send(path, options);
  if (retried.status === 401) {
    expireSession();
  }
  return parseResponse<T>(retried);
}

type BodylessOptions = Omit<RequestOptions, 'method' | 'body'>;

export const apiClient = {
  get: <T>(path: string, options?: BodylessOptions) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: BodylessOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: BodylessOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: BodylessOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T = void>(path: string, options?: BodylessOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};

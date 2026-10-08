import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonResponse, makeCurrentUser } from '@/test/testUtils';

import { apiClient, REFRESH_LOCK_NAME, refreshSession } from './apiClient';
import { ApiError } from './apiError';
import { sessionStore } from './sessionStore';

const fetchMock = vi.fn<typeof fetch>();

function tokenResponse(token: string) {
  return jsonResponse({
    access_token: token,
    token_type: 'bearer',
    expires_in: 900,
    user: makeCurrentUser(),
  });
}

function errorResponse(status: number, code: string, message: string, details: unknown = null) {
  return jsonResponse({ error: { code, message, details, request_id: 'req-123' } }, { status });
}

function requestUrl(callIndex: number): string {
  // The client always calls fetch(url: string, init).
  return fetchMock.mock.calls[callIndex]?.[0] as string;
}

function requestHeaders(callIndex: number): Headers {
  return (fetchMock.mock.calls[callIndex]?.[1]?.headers ?? new Headers()) as Headers;
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  sessionStore.reset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiClient', () => {
  it('prefixes the API base URL, serialises query params and attaches the bearer token', async () => {
    sessionStore.setSession('access-1', makeCurrentUser());
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    const result = await apiClient.get<{ ok: boolean }>('/users', {
      params: { page: 2, page_size: 10, search: '', role_id: undefined },
    });

    expect(result).toEqual({ ok: true });
    expect(requestUrl(0)).toBe('/api/v1/users?page=2&page_size=10');
    expect(requestHeaders(0).get('Authorization')).toBe('Bearer access-1');
    expect(fetchMock.mock.calls[0]?.[1]?.credentials).toBe('include');
  });

  it('does not attach the bearer token for skipAuth requests', async () => {
    sessionStore.setSession('access-1', makeCurrentUser());
    fetchMock.mockResolvedValueOnce(tokenResponse('access-2'));

    await apiClient.post('/auth/login', { email: 'a@b.co', password: 'x' }, { skipAuth: true });

    expect(requestHeaders(0).get('Authorization')).toBeNull();
    expect(requestHeaders(0).get('Content-Type')).toBe('application/json');
  });

  it('refreshes once on 401 and retries the original request with the new token', async () => {
    sessionStore.setSession('expired-token', makeCurrentUser());
    fetchMock
      .mockResolvedValueOnce(errorResponse(401, 'token_expired', 'Token expired'))
      .mockResolvedValueOnce(tokenResponse('fresh-token'))
      .mockResolvedValueOnce(jsonResponse({ id: 7 }));

    const result = await apiClient.get<{ id: number }>('/users/7');

    expect(result).toEqual({ id: 7 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(requestUrl(1)).toBe('/api/v1/auth/refresh');
    expect(requestHeaders(2).get('Authorization')).toBe('Bearer fresh-token');
    expect(sessionStore.getAccessToken()).toBe('fresh-token');
  });

  it('shares a single in-flight refresh between concurrent callers', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse('shared-token'));

    const [first, second] = await Promise.all([refreshSession(), refreshSession()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first.access_token).toBe('shared-token');
    expect(second.access_token).toBe('shared-token');
  });

  it('holds a cross-tab Web Lock while refreshing when the browser supports it', async () => {
    const lockRequest = vi.fn((_name: string, task: () => Promise<unknown>) => task());
    vi.stubGlobal('navigator', { locks: { request: lockRequest } }); // restored in afterEach
    fetchMock.mockResolvedValueOnce(tokenResponse('locked-token'));

    await expect(refreshSession()).resolves.toMatchObject({ access_token: 'locked-token' });
    expect(lockRequest).toHaveBeenCalledWith(REFRESH_LOCK_NAME, expect.any(Function));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('clears the session and rethrows when the refresh fails', async () => {
    sessionStore.setSession('expired-token', makeCurrentUser());
    fetchMock
      .mockResolvedValueOnce(errorResponse(401, 'token_expired', 'Token expired'))
      .mockResolvedValueOnce(errorResponse(401, 'invalid_refresh_token', 'Invalid refresh token'));

    await expect(apiClient.get('/users')).rejects.toMatchObject({
      status: 401,
      code: 'token_expired',
    });

    expect(sessionStore.getState()).toMatchObject({ status: 'anonymous', endReason: 'expired' });
  });

  it('parses the backend error envelope into an ApiError', async () => {
    fetchMock.mockResolvedValueOnce(
      errorResponse(422, 'validation_error', 'Some fields are invalid.', [
        { field: 'email', loc: ['body', 'email'], message: 'Invalid email', type: 'value_error' },
      ]),
    );

    const error = await apiClient.post('/users', {}).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      code: 'validation_error',
      message: 'Some fields are invalid.',
      requestId: 'req-123',
    });
    expect((error as ApiError).details?.[0]?.field).toBe('email');
  });

  it('falls back to a generic error for non-JSON responses', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>Bad gateway</html>', { status: 502 }));

    await expect(apiClient.get('/health')).rejects.toMatchObject({ status: 502, code: 'http_502' });
  });

  it('turns network failures into a network_error ApiError', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(apiClient.get('/health')).rejects.toMatchObject({
      status: 0,
      code: 'network_error',
    });
  });

  it('returns undefined for 204 No Content', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(
      apiClient.post('/auth/logout', undefined, { skipAuth: true }),
    ).resolves.toBeUndefined();
  });
});

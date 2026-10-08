/** Typed access to build-time environment variables (VITE_* only). */

function readNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const env = {
  appName: import.meta.env.VITE_APP_NAME?.trim() || 'Base Project',
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL?.trim() || '/api/v1').replace(/\/+$/, ''),
  apiTimeoutMs: readNumber(import.meta.env.VITE_API_TIMEOUT_MS, 15_000),
} as const;

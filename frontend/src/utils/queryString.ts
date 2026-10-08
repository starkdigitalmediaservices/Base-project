type QueryValue = string | number | boolean | null | undefined;

/**
 * Builds "?a=1&b=x" from an object, skipping null/undefined/empty-string values so optional
 * filters are simply omitted from the request.
 */
export function buildQueryString(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') {
      continue;
    }
    search.append(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

import { keepPreviousData, type QueryKey, useQuery } from '@tanstack/react-query';

import type { Page } from '@/types/api';

/**
 * Fetches exactly one backend page for the given params. Previous page data stays visible while the
 * next page loads (keepPreviousData), so tables don't flash empty between pages.
 */
export function usePaginatedQuery<TItem, TParams>(
  queryKey: QueryKey,
  params: TParams,
  fetchPage: (params: TParams, signal: AbortSignal) => Promise<Page<TItem>>,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: [...queryKey, params],
    queryFn: ({ signal }) => fetchPage(params, signal),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}

import { useCallback, useMemo, useState } from 'react';

import { DEFAULT_PAGE_SIZE } from '@/utils/pagination';

import type { DataTableState, SortState } from './types';

export interface UseDataTableStateOptions {
  initialPageSize?: number;
  initialSort?: SortState | null;
  initialFilters?: Record<string, string>;
}

export interface DataTableController {
  state: DataTableState;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSearch: (search: string) => void;
  setFilter: (key: string, value: string) => void;
  toggleSort: (sortKey: string) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
}

const EMPTY_FILTERS: Record<string, string> = {};

function nextSort(current: SortState | null, sortKey: string): SortState | null {
  if (!current || current.sortBy !== sortKey) return { sortBy: sortKey, sortOrder: 'asc' };
  if (current.sortOrder === 'asc') return { sortBy: sortKey, sortOrder: 'desc' };
  return null; // third click returns to the backend default order
}

/**
 * Server-side table state. Any change to search, filters, sort or page size resets to page 1 so
 * the user never lands on a page that no longer exists.
 */
export function useDataTableState(options: UseDataTableStateOptions = {}): DataTableController {
  const {
    initialPageSize = DEFAULT_PAGE_SIZE,
    initialSort = null,
    initialFilters = EMPTY_FILTERS,
  } = options;

  const [state, setState] = useState<DataTableState>(() => ({
    page: 1,
    pageSize: initialPageSize,
    search: '',
    filters: initialFilters,
    sort: initialSort,
  }));

  const setPage = useCallback((page: number) => {
    setState((current) => (current.page === page ? current : { ...current, page }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setState((current) => ({ ...current, pageSize, page: 1 }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setState((current) => (current.search === search ? current : { ...current, search, page: 1 }));
  }, []);

  const setFilter = useCallback((key: string, value: string) => {
    setState((current) =>
      (current.filters[key] ?? '') === value
        ? current
        : { ...current, filters: { ...current.filters, [key]: value }, page: 1 },
    );
  }, []);

  const toggleSort = useCallback((sortKey: string) => {
    setState((current) => ({ ...current, sort: nextSort(current.sort, sortKey), page: 1 }));
  }, []);

  const resetFilters = useCallback(() => {
    setState((current) => ({ ...current, search: '', filters: initialFilters, page: 1 }));
  }, [initialFilters]);

  const hasActiveFilters =
    state.search !== '' || Object.values(state.filters).some((value) => value !== '');

  return useMemo(
    () => ({
      state,
      setPage,
      setPageSize,
      setSearch,
      setFilter,
      toggleSort,
      resetFilters,
      hasActiveFilters,
    }),
    [state, setPage, setPageSize, setSearch, setFilter, toggleSort, resetFilters, hasActiveFilters],
  );
}

/** Common API params (page, page_size, search, sort_by, sort_order) from table state. */
export function toPageQuery(state: DataTableState) {
  return {
    page: state.page,
    page_size: state.pageSize,
    search: state.search || undefined,
    sort_by: state.sort?.sortBy,
    sort_order: state.sort?.sortOrder,
  };
}

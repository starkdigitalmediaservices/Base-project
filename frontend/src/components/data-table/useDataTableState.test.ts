import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { toPageQuery, useDataTableState } from './useDataTableState';

describe('useDataTableState', () => {
  it('defaults to page 1 with 10 rows per page', () => {
    const { result } = renderHook(() => useDataTableState());
    expect(result.current.state).toMatchObject({ page: 1, pageSize: 10, search: '', sort: null });
  });

  it('resets the page whenever the query changes', () => {
    const { result } = renderHook(() => useDataTableState({ initialFilters: { role_id: '' } }));

    act(() => result.current.setPage(3));
    act(() => result.current.setSearch('ada'));
    expect(result.current.state.page).toBe(1);

    act(() => result.current.setPage(3));
    act(() => result.current.setFilter('role_id', '2'));
    expect(result.current.state.page).toBe(1);

    act(() => result.current.setPage(3));
    act(() => result.current.toggleSort('name'));
    expect(result.current.state.page).toBe(1);

    act(() => result.current.setPage(3));
    act(() => result.current.setPageSize(50));
    expect(result.current.state).toMatchObject({ page: 1, pageSize: 50 });
  });

  it('cycles sorting asc → desc → default', () => {
    const { result } = renderHook(() => useDataTableState());
    act(() => result.current.toggleSort('email'));
    expect(result.current.state.sort).toEqual({ sortBy: 'email', sortOrder: 'asc' });
    act(() => result.current.toggleSort('email'));
    expect(result.current.state.sort).toEqual({ sortBy: 'email', sortOrder: 'desc' });
    act(() => result.current.toggleSort('email'));
    expect(result.current.state.sort).toBeNull();
  });

  it('maps state to API query params', () => {
    const { result } = renderHook(() => useDataTableState());
    act(() => result.current.setSearch('ada'));
    act(() => result.current.toggleSort('name'));
    expect(toPageQuery(result.current.state)).toEqual({
      page: 1,
      page_size: 10,
      search: 'ada',
      sort_by: 'name',
      sort_order: 'asc',
    });
  });
});

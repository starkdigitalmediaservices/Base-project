import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { ApiError } from '@/services/apiError';
import { renderWithProviders } from '@/test/testUtils';
import type { Page } from '@/types/api';

import { DataTable } from './DataTable';
import type { BulkAction, DataTableColumn } from './types';
import { toPageQuery, useDataTableState } from './useDataTableState';

interface Person {
  id: number;
  name: string;
  active: boolean;
}

type Params = ReturnType<typeof toPageQuery> & { status?: string };

const PEOPLE: Person[] = Array.from({ length: 25 }, (_, index) => ({
  id: index + 1,
  name: `Person ${index + 1}`,
  active: index % 2 === 0,
}));

/** Fake backend: returns exactly one page, like the FastAPI endpoints do. */
function fakeBackend(rows: Person[] = PEOPLE) {
  return vi.fn((params: Params): Promise<Page<Person>> => {
    const start = (params.page - 1) * params.page_size;
    return Promise.resolve({
      items: rows.slice(start, start + params.page_size),
      page: params.page,
      page_size: params.page_size,
      total: rows.length,
      total_pages: Math.ceil(rows.length / params.page_size),
    });
  });
}

const COLUMNS: DataTableColumn<Person>[] = [
  { id: 'name', header: 'Name', sortKey: 'name', cell: (row) => row.name },
  {
    id: 'status',
    header: 'Status',
    cell: (row) => (row.active ? 'Active' : 'Inactive'),
    filter: {
      key: 'status',
      type: 'select',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
  },
];

interface HarnessProps {
  fetchPage: (params: Params, signal: AbortSignal) => Promise<Page<Person>>;
  bulkActions?: BulkAction<Person>[];
}

function Harness({ fetchPage, bulkActions }: HarnessProps) {
  const controller = useDataTableState({ initialFilters: { status: '' } });
  const params: Params = {
    ...toPageQuery(controller.state),
    status: controller.state.filters.status || undefined,
  };
  const query = usePaginatedQuery(['people'], params, fetchPage);
  return (
    <DataTable
      caption="People"
      columns={COLUMNS}
      data={query.data}
      controller={controller}
      getRowId={(row) => row.id}
      getRowLabel={(row) => row.name}
      isLoading={query.isPending}
      isFetching={query.isFetching}
      error={query.error}
      onRetry={() => void query.refetch()}
      selectable
      bulkActions={bulkActions}
    />
  );
}

function lastParams(mock: ReturnType<typeof fakeBackend>): Params | undefined {
  return mock.mock.calls.at(-1)?.[0];
}

describe('DataTable', () => {
  it('requests only the first page (default size 10) and renders its rows and metadata', async () => {
    const fetchPage = fakeBackend();
    renderWithProviders(<Harness fetchPage={fetchPage} />);

    expect(await screen.findByText('Person 1')).toBeInTheDocument();
    expect(screen.getByText('Person 10')).toBeInTheDocument();
    expect(screen.queryByText('Person 11')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1–10 of 25')).toBeInTheDocument();
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(lastParams(fetchPage)).toMatchObject({ page: 1, page_size: 10 });
  });

  it('requests the next page from the backend when paginating', async () => {
    const user = userEvent.setup();
    const fetchPage = fakeBackend();
    renderWithProviders(<Harness fetchPage={fetchPage} />);
    await screen.findByText('Person 1');

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    expect(await screen.findByText('Person 11')).toBeInTheDocument();
    expect(lastParams(fetchPage)).toMatchObject({ page: 2, page_size: 10 });
    expect(screen.getByText('Showing 11–20 of 25')).toBeInTheDocument();
  });

  it('toggles sort parameters and aria-sort', async () => {
    const user = userEvent.setup();
    const fetchPage = fakeBackend();
    renderWithProviders(<Harness fetchPage={fetchPage} />);
    await screen.findByText('Person 1');

    const sortButton = screen.getByRole('button', { name: /^Name/ });
    await user.click(sortButton);
    await waitFor(() =>
      expect(lastParams(fetchPage)).toMatchObject({ sort_by: 'name', sort_order: 'asc' }),
    );
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );

    await user.click(sortButton);
    await waitFor(() =>
      expect(lastParams(fetchPage)).toMatchObject({ sort_by: 'name', sort_order: 'desc' }),
    );
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
  });

  it('resets to page 1 when the page size changes', async () => {
    const user = userEvent.setup();
    const fetchPage = fakeBackend();
    renderWithProviders(<Harness fetchPage={fetchPage} />);
    await screen.findByText('Person 1');

    await user.click(screen.getByRole('button', { name: 'Page 2' }));
    await screen.findByText('Person 11');

    await user.selectOptions(screen.getByLabelText('Rows per page'), '25');

    await waitFor(() => expect(lastParams(fetchPage)).toMatchObject({ page: 1, page_size: 25 }));
    expect(await screen.findByText('Person 25')).toBeInTheDocument();
  });

  it('applies filters through the API and resets them', async () => {
    const user = userEvent.setup();
    const fetchPage = fakeBackend();
    renderWithProviders(<Harness fetchPage={fetchPage} />);
    await screen.findByText('Person 1');

    await user.selectOptions(screen.getByLabelText('Status'), 'active');
    await waitFor(() => expect(lastParams(fetchPage)).toMatchObject({ status: 'active', page: 1 }));

    await user.click(screen.getAllByRole('button', { name: 'Reset filters' })[0]!);
    await waitFor(() => expect(lastParams(fetchPage)?.status).toBeUndefined());
  });

  it('debounces the global search before requesting the API', async () => {
    const user = userEvent.setup();
    const fetchPage = fakeBackend();
    renderWithProviders(<Harness fetchPage={fetchPage} />);
    await screen.findByText('Person 1');

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'Ada');

    await waitFor(() => expect(lastParams(fetchPage)).toMatchObject({ search: 'Ada', page: 1 }));
    // One initial request + one debounced search request (not one per keystroke).
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('supports row selection, select-all with indeterminate state, and bulk actions', async () => {
    const user = userEvent.setup();
    const onBulk = vi.fn();
    renderWithProviders(
      <Harness
        fetchPage={fakeBackend()}
        bulkActions={[{ id: 'archive', label: 'Archive', onClick: onBulk }]}
      />,
    );
    await screen.findByText('Person 1');

    const selectAll = screen.getAllByRole('checkbox', { name: 'Select all rows on this page' })[0]!;
    await user.click(screen.getByRole('checkbox', { name: 'Select Person 1' }));
    expect(selectAll).toHaveProperty('indeterminate', true);
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    await user.click(selectAll);
    expect(screen.getByText('10 selected')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Archive' }));
    expect(onBulk).toHaveBeenCalledTimes(1);
    expect(onBulk.mock.calls[0]?.[0]).toHaveLength(10);
  });

  it('shows the empty state', async () => {
    renderWithProviders(<Harness fetchPage={fakeBackend([])} />);
    expect(await screen.findByText('No records found')).toBeInTheDocument();
    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  it('shows the error state with a working retry', async () => {
    const user = userEvent.setup();
    const fetchPage = vi
      .fn<HarnessProps['fetchPage']>()
      .mockRejectedValueOnce(
        new ApiError({ status: 500, code: 'internal_error', message: 'Server exploded' }),
      )
      .mockImplementation((params) => fakeBackend()(params));
    renderWithProviders(<Harness fetchPage={fetchPage} />);

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Could not load data')).toBeInTheDocument();
    expect(within(alert).getByText('Server exploded')).toBeInTheDocument();

    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Person 1')).toBeInTheDocument();
  });
});

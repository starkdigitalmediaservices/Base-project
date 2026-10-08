import { type ReactNode, useEffect, useState } from 'react';

import { AppButton } from '@/components/ui/AppButton';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateMessage';
import type { Page } from '@/types/api';
import clsx from '@/utils/clsx';
import { downloadTextFile, toCsv } from '@/utils/csv';

import styles from './DataTable.module.css';
import { DataTableFooter } from './DataTableFooter';
import { DataTableToolbar } from './DataTableToolbar';
import { RowActionsMenu } from './RowActionsMenu';
import type { BulkAction, DataTableColumn, RowAction, RowId } from './types';
import type { DataTableController } from './useDataTableState';

export interface DataTableProps<T> {
  /** Accessible table caption (visually hidden). */
  caption: string;
  columns: DataTableColumn<T>[];
  /** One backend page. The table never fetches or slices data itself. */
  data: Page<T> | undefined;
  controller: DataTableController;
  getRowId: (row: T) => RowId;
  /** Human-readable row name used in accessible labels ("Actions for Jane Doe"). */
  getRowLabel?: (row: T) => string;
  /** First load (no data yet). */
  isLoading: boolean;
  /** Background refetch/page change while previous data is shown. */
  isFetching?: boolean;
  error?: unknown;
  onRetry?: () => void;
  searchable?: boolean;
  searchLabel?: string;
  searchPlaceholder?: string;
  selectable?: boolean;
  rowActions?: (row: T) => RowAction<T>[];
  bulkActions?: BulkAction<T>[];
  /** Enables "Export page (CSV)" for columns that define exportValue. */
  exportFileName?: string;
  toolbarActions?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  /** "stack" turns rows into cards below the md breakpoint; "scroll" keeps a scrollable table. */
  responsiveMode?: 'scroll' | 'stack';
}

const EMPTY_ROWS: never[] = [];
const SKELETON_ROW_LIMIT = 10;

function sortIcon(active: boolean, order: 'asc' | 'desc' | undefined): IconName {
  if (!active) return 'arrow-down-up';
  return order === 'asc' ? 'arrow-up' : 'arrow-down';
}

/**
 * Reusable server-driven table: search, filters, sorting, selection, row/bulk actions, export,
 * loading/empty/error states and backend pagination. It renders exactly the page it is given.
 */
export function DataTable<T>({
  caption,
  columns,
  data,
  controller,
  getRowId,
  getRowLabel,
  isLoading,
  isFetching = false,
  error,
  onRetry,
  searchable = true,
  searchLabel = 'Search',
  searchPlaceholder = 'Search…',
  selectable = false,
  rowActions,
  bulkActions,
  exportFileName,
  toolbarActions,
  emptyTitle = 'No records found',
  emptyDescription,
  responsiveMode = 'scroll',
}: DataTableProps<T>) {
  const { state, setPage, setPageSize, toggleSort, resetFilters, hasActiveFilters } = controller;
  const rows: T[] = data?.items ?? EMPTY_ROWS;

  // Selection is per page: it resets whenever a different page of rows arrives.
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<RowId>>(() => new Set());
  const [selectionRows, setSelectionRows] = useState(rows);
  if (selectionRows !== rows) {
    setSelectionRows(rows);
    setSelectedIds(new Set());
  }

  // If the current page disappeared (e.g. rows deleted), step back to the last available page.
  useEffect(() => {
    if (data && data.total_pages > 0 && state.page > data.total_pages) {
      setPage(data.total_pages);
    }
  }, [data, state.page, setPage]);

  const filters = columns.flatMap((column) => (column.filter ? [column.filter] : []));
  const hasRowActions = Boolean(rowActions);
  const columnCount = columns.length + (selectable ? 1 : 0) + (hasRowActions ? 1 : 0);

  const selectedRows = rows.filter((row) => selectedIds.has(getRowId(row)));
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;
  const someSelected = selectedRows.length > 0 && !allSelected;

  const toggleRow = (id: RowId) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(rows.map(getRowId)));
  };

  const exportColumns = columns.filter((column) => column.exportValue);
  const handleExport =
    exportFileName && exportColumns.length > 0
      ? () => {
          const csv = toCsv(
            rows,
            exportColumns.map((column) => ({
              header: column.header,
              value: (row: T) => column.exportValue?.(row),
            })),
          );
          downloadTextFile(csv, `${exportFileName}-page-${state.page}.csv`);
        }
      : undefined;

  const rowLabel = (row: T) => getRowLabel?.(row) ?? `row ${String(getRowId(row))}`;

  const selectAllCheckbox = (
    <input
      type="checkbox"
      className="form-check-input"
      checked={allSelected}
      ref={(element) => {
        if (element) element.indeterminate = someSelected;
      }}
      onChange={toggleAll}
      disabled={rows.length === 0}
      aria-label="Select all rows on this page"
    />
  );

  const renderBody = () => {
    if (isLoading && !data) {
      return Array.from({ length: Math.min(state.pageSize, SKELETON_ROW_LIMIT) }, (_, index) => (
        <tr key={`skeleton-${index}`} aria-hidden="true">
          {Array.from({ length: columnCount }, (_, cellIndex) => (
            <td key={cellIndex}>
              <Skeleton width={cellIndex % 2 === 0 ? 'three-quarters' : 'half'} />
            </td>
          ))}
        </tr>
      ));
    }

    if (error && !data) {
      return (
        <tr>
          <td colSpan={columnCount} className={styles.stateCell}>
            <ErrorState title="Could not load data" error={error} onRetry={onRetry} compact />
          </td>
        </tr>
      );
    }

    if (rows.length === 0) {
      return (
        <tr>
          <td colSpan={columnCount} className={styles.stateCell}>
            <EmptyState
              compact
              title={hasActiveFilters ? 'No results match your filters' : emptyTitle}
              description={
                hasActiveFilters
                  ? 'Try a different search term or reset the filters.'
                  : emptyDescription
              }
              action={
                hasActiveFilters ? (
                  <AppButton variant="outline-primary" size="sm" onClick={resetFilters}>
                    Reset filters
                  </AppButton>
                ) : undefined
              }
            />
          </td>
        </tr>
      );
    }

    return rows.map((row) => {
      const id = getRowId(row);
      const isSelected = selectedIds.has(id);
      return (
        <tr
          key={id}
          className={clsx(isSelected && 'table-active')}
          aria-selected={selectable ? isSelected : undefined}
        >
          {selectable && (
            <td className={styles.selectCell} data-label="Select">
              <input
                type="checkbox"
                className="form-check-input"
                checked={isSelected}
                onChange={() => toggleRow(id)}
                aria-label={`Select ${rowLabel(row)}`}
              />
            </td>
          )}
          {columns.map((column) => (
            <td
              key={column.id}
              data-label={column.header}
              className={clsx(column.align && `text-${column.align}`, column.cellClassName)}
            >
              {column.cell(row)}
            </td>
          ))}
          {rowActions && (
            <td className={styles.actionsCell} data-label="Actions">
              <RowActionsMenu row={row} actions={rowActions(row)} rowLabel={rowLabel(row)} />
            </td>
          )}
        </tr>
      );
    });
  };

  return (
    <div className={styles.wrapper}>
      <DataTableToolbar
        controller={controller}
        filters={filters}
        searchable={searchable}
        searchLabel={searchLabel}
        searchPlaceholder={searchPlaceholder}
        onExport={handleExport}
        exportDisabled={rows.length === 0}
        actions={toolbarActions}
      />

      {error && data ? (
        <div className="alert alert-warning d-flex align-items-center gap-2 mb-3" role="alert">
          <Icon name="exclamation-triangle" />
          <span className="flex-grow-1">
            Showing previously loaded data — the latest request failed.
          </span>
          {onRetry && (
            <AppButton size="sm" variant="outline-secondary" onClick={onRetry}>
              Retry
            </AppButton>
          )}
        </div>
      ) : null}

      {selectable && (selectedRows.length > 0 || responsiveMode === 'stack') && (
        <div
          // With nothing selected the bar only holds the mobile "Select all"; hide it from md up.
          className={clsx(styles.selectionBar, selectedRows.length === 0 && 'd-md-none')}
          aria-live="polite"
        >
          {responsiveMode === 'stack' && (
            <label className={clsx('form-check d-md-none mb-0', styles.mobileSelectAll)}>
              {selectAllCheckbox}
              <span className="form-check-label ms-2">Select all</span>
            </label>
          )}
          {selectedRows.length > 0 && (
            <>
              <span className="fw-semibold">{selectedRows.length} selected</span>
              {bulkActions?.map((action) => (
                <AppButton
                  key={action.id}
                  size="sm"
                  variant={action.variant ?? 'outline-secondary'}
                  icon={action.icon}
                  disabled={action.disabled}
                  onClick={() => void action.onClick(selectedRows)}
                >
                  {action.label}
                </AppButton>
              ))}
              <AppButton size="sm" variant="link" onClick={() => setSelectedIds(new Set())}>
                Clear selection
              </AppButton>
            </>
          )}
        </div>
      )}

      <div className={clsx('table-responsive', styles.tableContainer)}>
        <table
          className={clsx(
            'table table-hover align-middle mb-0',
            styles.table,
            responsiveMode === 'stack' && styles.stacked,
          )}
          aria-busy={isLoading || isFetching}
        >
          <caption className="visually-hidden">{caption}</caption>
          <thead>
            <tr>
              {selectable && (
                <th scope="col" className={styles.selectCell}>
                  {selectAllCheckbox}
                </th>
              )}
              {columns.map((column) => {
                const isSorted = Boolean(column.sortKey) && state.sort?.sortBy === column.sortKey;
                return (
                  <th
                    key={column.id}
                    scope="col"
                    className={clsx(column.align && `text-${column.align}`, column.headerClassName)}
                    aria-sort={
                      isSorted
                        ? state.sort?.sortOrder === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                  >
                    {column.sortKey ? (
                      <button
                        type="button"
                        className={clsx(styles.sortButton, isSorted && styles.sorted)}
                        onClick={() => toggleSort(column.sortKey as string)}
                      >
                        {column.header}
                        <Icon name={sortIcon(isSorted, state.sort?.sortOrder)} className="ms-1" />
                        <span className="visually-hidden">
                          {isSorted
                            ? `, sorted ${state.sort?.sortOrder === 'asc' ? 'ascending' : 'descending'}`
                            : ', sortable'}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
              {hasRowActions && (
                <th scope="col" className={styles.actionsCell}>
                  <span className="visually-hidden">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className={clsx(isFetching && !isLoading && styles.fetching)}>
            {renderBody()}
          </tbody>
        </table>
      </div>

      {data && (
        <DataTableFooter
          page={data.page}
          pageSize={data.page_size}
          selectedPageSize={state.pageSize}
          total={data.total}
          totalPages={data.total_pages}
          isFetching={isFetching}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
}

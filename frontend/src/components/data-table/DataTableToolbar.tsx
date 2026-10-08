import type { ReactNode } from 'react';

import { SelectField } from '@/components/forms/SelectField';
import { AppButton } from '@/components/ui/AppButton';

import styles from './DataTable.module.css';
import { DebouncedTextFilter } from './DebouncedTextFilter';
import type { ColumnFilter } from './types';
import type { DataTableController } from './useDataTableState';

interface DataTableToolbarProps {
  controller: DataTableController;
  filters: ColumnFilter[];
  searchable: boolean;
  searchLabel: string;
  searchPlaceholder: string;
  onExport?: () => void;
  exportDisabled?: boolean;
  actions?: ReactNode;
}

/** Global search, per-column filters, reset, export and custom actions. */
export function DataTableToolbar({
  controller,
  filters,
  searchable,
  searchLabel,
  searchPlaceholder,
  onExport,
  exportDisabled,
  actions,
}: DataTableToolbarProps) {
  const { state, setSearch, setFilter, resetFilters, hasActiveFilters } = controller;

  return (
    <div className={styles.toolbar}>
      <div className={styles.filters}>
        {searchable && (
          <DebouncedTextFilter
            value={state.search}
            onCommit={setSearch}
            label={searchLabel}
            placeholder={searchPlaceholder}
            className={styles.search}
          />
        )}
        {filters.map((filter) =>
          filter.type === 'select' ? (
            <SelectField
              key={filter.key}
              label={filter.label}
              hideLabel
              size="sm"
              wrapperClassName={styles.filter}
              options={filter.options ?? []}
              placeholder={filter.placeholder ?? `All ${filter.label.toLowerCase()}`}
              value={state.filters[filter.key] ?? ''}
              onChange={(event) => setFilter(filter.key, event.target.value)}
            />
          ) : (
            <DebouncedTextFilter
              key={filter.key}
              value={state.filters[filter.key] ?? ''}
              onCommit={(value) => setFilter(filter.key, value)}
              label={filter.label}
              placeholder={filter.placeholder ?? filter.label}
              className={styles.filter}
            />
          ),
        )}
        {hasActiveFilters && (
          <AppButton variant="link" size="sm" icon="x-circle" onClick={resetFilters}>
            Reset filters
          </AppButton>
        )}
      </div>
      {(onExport || actions) && (
        <div className={styles.toolbarActions}>
          {onExport && (
            <AppButton
              variant="outline-secondary"
              size="sm"
              icon="download"
              onClick={onExport}
              disabled={exportDisabled}
              title="Exports only the rows on the current page. Use a backend export endpoint for full exports."
            >
              Export page (CSV)
            </AppButton>
          )}
          {actions}
        </div>
      )}
    </div>
  );
}

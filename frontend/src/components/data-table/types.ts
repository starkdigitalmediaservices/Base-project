import type { ReactNode } from 'react';

import type { IconName } from '@/components/ui/Icon';
import type { SortOrder } from '@/types/api';

export type RowId = string | number;

export interface SelectFilterOption {
  value: string;
  label: string;
}

export interface ColumnFilter {
  /** Key under which the value is stored in table state (usually the API query param). */
  key: string;
  type: 'text' | 'select';
  label: string;
  placeholder?: string;
  options?: readonly SelectFilterOption[];
}

export interface DataTableColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Backend sort key (e.g. "created_at"). Omit to make the column non-sortable. */
  sortKey?: string;
  filter?: ColumnFilter;
  /** Value written to CSV exports; columns without it are not exported. */
  exportValue?: (row: T) => string | number | boolean | null | undefined;
  align?: 'start' | 'center' | 'end';
  headerClassName?: string;
  cellClassName?: string;
}

export interface SortState {
  sortBy: string;
  sortOrder: SortOrder;
}

export interface DataTableState {
  page: number;
  pageSize: number;
  search: string;
  filters: Record<string, string>;
  sort: SortState | null;
}

export interface RowAction<T> {
  id: string;
  label: string;
  icon?: IconName;
  variant?: 'danger' | 'default';
  onClick: (row: T) => void;
  disabled?: boolean;
  hidden?: boolean;
}

export interface BulkAction<T> {
  id: string;
  label: string;
  icon?: IconName;
  variant?: string;
  onClick: (rows: T[]) => void | Promise<void>;
  disabled?: boolean;
}

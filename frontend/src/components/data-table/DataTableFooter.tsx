import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageSizeSelect } from '@/components/ui/PageSizeSelect';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { formatNumber } from '@/utils/format';
import { getPageWindow } from '@/utils/pagination';

import styles from './DataTable.module.css';

interface DataTableFooterProps {
  /** Page number of the rows currently displayed (from the API response). */
  page: number;
  /** page_size of the rows currently displayed (from the API response). */
  pageSize: number;
  /** Page size currently requested (table state). */
  selectedPageSize: number;
  total: number;
  totalPages: number;
  isFetching: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

/** "Showing x–y of z", page-size selector and pagination, all driven by backend metadata. */
export function DataTableFooter({
  page,
  pageSize,
  selectedPageSize,
  total,
  totalPages,
  isFetching,
  onPageChange,
  onPageSizeChange,
}: DataTableFooterProps) {
  const { from, to } = getPageWindow(page, pageSize, total);
  return (
    <div className={styles.footer}>
      <div className={styles.summary} aria-live="polite">
        {total === 0
          ? 'No results'
          : `Showing ${formatNumber(from)}–${formatNumber(to)} of ${formatNumber(total)}`}
        {isFetching && <LoadingSpinner size="sm" label="Updating results" className="ms-2" />}
      </div>
      <PageSizeSelect value={selectedPageSize} onChange={onPageSizeChange} />
      <PaginationControls
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
        size="sm"
        label="Table pagination"
      />
    </div>
  );
}

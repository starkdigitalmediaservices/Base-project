import Pagination from 'react-bootstrap/Pagination';

import { getPageRange } from '@/utils/pagination';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Pages shown on each side of the current page. */
  siblingCount?: number;
  size?: 'sm' | 'lg';
  label?: string;
  disabled?: boolean;
  className?: string;
}

/** Page navigation with first/prev/next/last and ellipses. Works with backend pagination metadata. */
export function PaginationControls({
  page,
  totalPages,
  onPageChange,
  siblingCount = 1,
  size,
  label = 'Pagination',
  disabled = false,
  className,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const range = getPageRange(page, totalPages, siblingCount);
  const goTo = (target: number) => {
    if (!disabled && target >= 1 && target <= totalPages && target !== page) {
      onPageChange(target);
    }
  };

  return (
    <nav aria-label={label} className={className}>
      <Pagination size={size} className="mb-0 flex-wrap">
        <Pagination.First
          disabled={disabled || page <= 1}
          onClick={() => goTo(1)}
          aria-label="First page"
        />
        <Pagination.Prev
          disabled={disabled || page <= 1}
          onClick={() => goTo(page - 1)}
          aria-label="Previous page"
        />
        {range.map((item, index) =>
          item === 'ellipsis' ? (
            <Pagination.Ellipsis key={`ellipsis-${index}`} disabled aria-hidden="true" />
          ) : (
            <Pagination.Item
              key={item}
              active={item === page}
              disabled={disabled && item !== page}
              onClick={() => goTo(item)}
              aria-label={`Page ${item}`}
            >
              {item}
            </Pagination.Item>
          ),
        )}
        <Pagination.Next
          disabled={disabled || page >= totalPages}
          onClick={() => goTo(page + 1)}
          aria-label="Next page"
        />
        <Pagination.Last
          disabled={disabled || page >= totalPages}
          onClick={() => goTo(totalPages)}
          aria-label="Last page"
        />
      </Pagination>
    </nav>
  );
}

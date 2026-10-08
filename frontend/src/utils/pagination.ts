export type PageRangeItem = number | 'ellipsis';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 10;

/** [1, 'ellipsis', 4, 5, 6, 'ellipsis', 20] style range for pagination controls. */
export function getPageRange(page: number, totalPages: number, siblingCount = 1): PageRangeItem[] {
  const totalSlots = siblingCount * 2 + 5; // first, last, current, 2 ellipses
  if (totalPages <= totalSlots) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const left = Math.max(page - siblingCount, 1);
  const right = Math.min(page + siblingCount, totalPages);
  const showLeftEllipsis = left > 2;
  const showRightEllipsis = right < totalPages - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    const count = 3 + siblingCount * 2;
    return [...Array.from({ length: count }, (_, index) => index + 1), 'ellipsis', totalPages];
  }
  if (showLeftEllipsis && !showRightEllipsis) {
    const count = 3 + siblingCount * 2;
    return [
      1,
      'ellipsis',
      ...Array.from({ length: count }, (_, index) => totalPages - count + index + 1),
    ];
  }
  return [
    1,
    'ellipsis',
    ...Array.from({ length: right - left + 1 }, (_, index) => left + index),
    'ellipsis',
    totalPages,
  ];
}

/** "Showing 11–20 of 45" numbers for the current page. */
export function getPageWindow(page: number, pageSize: number, total: number) {
  if (total === 0) return { from: 0, to: 0 };
  const from = (page - 1) * pageSize + 1;
  return { from: Math.min(from, total), to: Math.min(page * pageSize, total) };
}

import clsx from '@/utils/clsx';

import styles from './Skeleton.module.css';

interface SkeletonProps {
  variant?: 'text' | 'rect' | 'circle';
  width?: 'full' | 'three-quarters' | 'half' | 'quarter';
  /** Number of text lines (variant="text" only). */
  lines?: number;
  className?: string;
}

/** Placeholder shimmer shown while content loads. Hidden from assistive tech. */
export function Skeleton({
  variant = 'text',
  width = 'full',
  lines = 1,
  className,
}: SkeletonProps) {
  if (variant === 'text' && lines > 1) {
    return (
      <span className={clsx(styles.stack, className)} aria-hidden="true">
        {Array.from({ length: lines }, (_, index) => (
          <span
            key={index}
            className={clsx(
              styles.skeleton,
              styles.text,
              index === lines - 1 ? styles['three-quarters'] : styles.full,
            )}
          />
        ))}
      </span>
    );
  }
  return (
    <span
      className={clsx(styles.skeleton, styles[variant], styles[width], className)}
      aria-hidden="true"
    />
  );
}

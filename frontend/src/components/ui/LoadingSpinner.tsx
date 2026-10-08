import Spinner from 'react-bootstrap/Spinner';

import clsx from '@/utils/clsx';

import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md';
  /** Show the label next to the spinner instead of only to screen readers. */
  showLabel?: boolean;
  className?: string;
}

export function LoadingSpinner({
  label = 'Loading…',
  size = 'md',
  showLabel = false,
  className,
}: LoadingSpinnerProps) {
  return (
    <div className={clsx(styles.wrapper, className)} role="status" aria-live="polite">
      <Spinner animation="border" size={size === 'sm' ? 'sm' : undefined} aria-hidden="true" />
      <span className={showLabel ? undefined : 'visually-hidden'}>{label}</span>
    </div>
  );
}

/** Centered loader for whole pages (session restore, lazy route chunks). */
export function FullPageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className={styles.fullPage}>
      <LoadingSpinner label={label} showLabel />
    </div>
  );
}

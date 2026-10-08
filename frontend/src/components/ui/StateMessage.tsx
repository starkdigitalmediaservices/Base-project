import type { ReactNode } from 'react';

import { getErrorMessage, isApiError } from '@/services/apiError';
import clsx from '@/utils/clsx';

import { AppButton } from './AppButton';
import { Icon, type IconName } from './Icon';
import styles from './StateMessage.module.css';

type Tone = 'neutral' | 'danger' | 'success' | 'warning';

interface StateMessageProps {
  icon: IconName;
  tone?: Tone;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** "status" for polite announcements, "alert" for errors. */
  role?: 'status' | 'alert';
  compact?: boolean;
}

function StateMessage({
  icon,
  tone = 'neutral',
  title,
  description,
  action,
  className,
  role = 'status',
  compact = false,
}: StateMessageProps) {
  return (
    <div className={clsx(styles.state, compact && styles.compact, className)} role={role}>
      <span className={clsx(styles.icon, styles[tone])}>
        <Icon name={icon} />
      </span>
      <p className={styles.title}>{title}</p>
      {description && <div className={styles.description}>{description}</div>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}

type PublicStateProps = Omit<StateMessageProps, 'icon' | 'tone' | 'role'> & { icon?: IconName };

/** Nothing to show yet (no results, no records). */
export function EmptyState({ icon = 'inbox', ...props }: PublicStateProps) {
  return <StateMessage icon={icon} tone="neutral" {...props} />;
}

/** Positive confirmation after an action. */
export function SuccessState({ icon = 'check-circle', ...props }: PublicStateProps) {
  return <StateMessage icon={icon} tone="success" {...props} />;
}

/** Non-blocking warning. */
export function WarningState({ icon = 'exclamation-triangle', ...props }: PublicStateProps) {
  return <StateMessage icon={icon} tone="warning" {...props} />;
}

interface ErrorStateProps extends Partial<Omit<PublicStateProps, 'description'>> {
  error?: unknown;
  description?: ReactNode;
  onRetry?: () => void;
  isRetrying?: boolean;
}

/** Failed request or render, with an optional retry button and the API request id. */
export function ErrorState({
  icon = 'exclamation-octagon',
  title = 'Something went wrong',
  error,
  description,
  onRetry,
  isRetrying = false,
  action,
  ...props
}: ErrorStateProps) {
  const message = description ?? getErrorMessage(error, 'Please try again in a moment.');
  const requestId = isApiError(error) ? error.requestId : null;
  return (
    <StateMessage
      icon={icon}
      tone="danger"
      role="alert"
      title={title}
      description={
        <>
          {message}
          {requestId && <small className={styles.reference}>Reference: {requestId}</small>}
        </>
      }
      action={
        action ??
        (onRetry && (
          <AppButton
            variant="outline-primary"
            size="sm"
            icon="arrow-clockwise"
            onClick={onRetry}
            isLoading={isRetrying}
          >
            Try again
          </AppButton>
        ))
      }
      {...props}
    />
  );
}

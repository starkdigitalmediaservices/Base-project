import clsx from '@/utils/clsx';

import { Icon, type IconName } from './Icon';

export type Status = 'active' | 'inactive' | 'pending' | 'success' | 'warning' | 'error' | 'info';

const STATUS_CONFIG: Record<Status, { variant: string; icon: IconName; label: string }> = {
  active: { variant: 'success', icon: 'check-circle', label: 'Active' },
  inactive: { variant: 'secondary', icon: 'x-circle', label: 'Inactive' },
  pending: { variant: 'warning', icon: 'arrow-clockwise', label: 'Pending' },
  success: { variant: 'success', icon: 'check-circle', label: 'Success' },
  warning: { variant: 'warning', icon: 'exclamation-triangle', label: 'Warning' },
  error: { variant: 'danger', icon: 'exclamation-octagon', label: 'Error' },
  info: { variant: 'info', icon: 'info-circle', label: 'Info' },
};

interface StatusBadgeProps {
  status: Status;
  /** Override the default label. */
  label?: string;
  pill?: boolean;
  className?: string;
}

/** Status pill that never relies on colour alone (icon + text). */
export function StatusBadge({ status, label, pill = true, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={clsx('badge', `text-bg-${config.variant}`, pill && 'rounded-pill', className)}>
      <Icon name={config.icon} className="me-1" />
      {label ?? config.label}
    </span>
  );
}

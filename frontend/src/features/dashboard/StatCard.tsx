import { Icon, type IconName } from '@/components/ui/Icon';
import clsx from '@/utils/clsx';

import styles from './StatCard.module.css';

interface StatCardProps {
  label: string;
  value: string;
  icon: IconName;
  trend?: { direction: 'up' | 'down'; text: string };
  tone?: 'primary' | 'success' | 'warning' | 'info';
}

/** KPI tile. Feed it real values from a backend endpoint when you build actual metrics. */
export function StatCard({ label, value, icon, trend, tone = 'primary' }: StatCardProps) {
  return (
    <div className={styles.card}>
      <span className={clsx(styles.icon, styles[tone])}>
        <Icon name={icon} />
      </span>
      <div className={styles.body}>
        <p className={styles.label}>{label}</p>
        <p className={styles.value}>{value}</p>
        {trend && (
          <p className={clsx(styles.trend, trend.direction === 'up' ? styles.up : styles.down)}>
            <Icon name={trend.direction === 'up' ? 'arrow-up' : 'arrow-down'} className="me-1" />
            {trend.text}
          </p>
        )}
      </div>
    </div>
  );
}

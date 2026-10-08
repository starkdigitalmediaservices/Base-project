import clsx from '@/utils/clsx';
import { getInitials } from '@/utils/format';

import styles from './Avatar.module.css';

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  /** Set when the name is already visible next to the avatar (hides it from screen readers). */
  decorative?: boolean;
  className?: string;
}

/** User avatar: image when available, otherwise initials. */
export function Avatar({ name, src, size = 'md', decorative = false, className }: AvatarProps) {
  const classes = clsx(styles.avatar, styles[size], className);
  if (src) {
    return <img src={src} alt={decorative ? '' : name} className={classes} loading="lazy" />;
  }
  return (
    <span
      className={classes}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative || undefined}
    >
      {getInitials(name)}
    </span>
  );
}

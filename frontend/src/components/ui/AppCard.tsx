import type { ReactNode } from 'react';
import Card from 'react-bootstrap/Card';

import clsx from '@/utils/clsx';

import styles from './AppCard.module.css';

interface AppCardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Buttons/links rendered on the right side of the card header. */
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Element used for the title (keep the document heading order correct). */
  titleAs?: 'h2' | 'h3' | 'h4';
}

/** Surface container with an optional header (title + actions) and footer. */
export function AppCard({
  title,
  subtitle,
  actions,
  footer,
  children,
  className,
  bodyClassName,
  titleAs: TitleTag = 'h2',
}: AppCardProps) {
  const hasHeader = Boolean(title || subtitle || actions);
  return (
    <Card className={clsx(styles.card, className)}>
      {hasHeader && (
        <div className={styles.header}>
          <div className={styles.headingGroup}>
            {title && <TitleTag className={styles.title}>{title}</TitleTag>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
      {children !== undefined && <Card.Body className={bodyClassName}>{children}</Card.Body>}
      {footer && <Card.Footer className={styles.footer}>{footer}</Card.Footer>}
    </Card>
  );
}

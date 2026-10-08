import type { ReactNode } from 'react';

import { useDocumentTitle } from '@/hooks/useDocumentTitle';

import { Breadcrumbs } from './Breadcrumbs';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Primary page actions (e.g. "Create user"). */
  actions?: ReactNode;
  showBreadcrumbs?: boolean;
}

/** Page title, description, breadcrumbs and action area. Also sets the document title. */
export function PageHeader({
  title,
  description,
  actions,
  showBreadcrumbs = true,
}: PageHeaderProps) {
  useDocumentTitle(title);
  return (
    <header className={styles.header}>
      {showBreadcrumbs && <Breadcrumbs />}
      <div className={styles.row}>
        <div className={styles.text}>
          <h1 className={styles.title}>{title}</h1>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </header>
  );
}

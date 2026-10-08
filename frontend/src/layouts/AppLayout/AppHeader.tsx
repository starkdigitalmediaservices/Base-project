import { Link } from 'react-router';

import { Icon } from '@/components/ui/Icon';
import { ROUTES } from '@/routes/paths';
import { useSidebar } from '@/store/useSidebar';
import { ThemeSwitcher } from '@/theme/ThemeSwitcher';
import { env } from '@/utils/env';

import styles from './AppLayout.module.css';
import { UserMenu } from './UserMenu';

export function AppHeader() {
  const { isCollapsed, toggleCollapsed, isMobileOpen, openMobile } = useSidebar();

  return (
    <header className={styles.header}>
      <button
        type="button"
        className={`btn btn-link d-lg-none ${styles.iconButton}`}
        onClick={openMobile}
        aria-controls="app-sidebar"
        aria-expanded={isMobileOpen}
        aria-label="Open navigation menu"
      >
        <Icon name="list" />
      </button>
      <button
        type="button"
        className={`btn btn-link d-none d-lg-inline-flex ${styles.iconButton}`}
        onClick={toggleCollapsed}
        aria-controls="app-sidebar"
        aria-expanded={!isCollapsed}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <Icon name={isCollapsed ? 'chevron-double-right' : 'chevron-double-left'} />
      </button>

      <Link to={ROUTES.dashboard} className={styles.brand}>
        <span className={styles.brandMark} aria-hidden="true">
          <Icon name="grid-1x2" />
        </span>
        <span className={styles.brandName}>{env.appName}</span>
      </Link>

      <div className={styles.headerActions}>
        <ThemeSwitcher />
        <UserMenu />
      </div>
    </header>
  );
}

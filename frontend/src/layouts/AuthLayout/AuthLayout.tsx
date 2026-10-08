import { Suspense } from 'react';
import { Outlet } from 'react-router';

import { Icon } from '@/components/ui/Icon';
import { FullPageLoader } from '@/components/ui/LoadingSpinner';
import { ThemeSwitcher } from '@/theme/ThemeSwitcher';
import { env } from '@/utils/env';

import styles from './AuthLayout.module.css';

/** Centered layout for public pages (login, not found). */
export function AuthLayout() {
  return (
    <div className={styles.layout}>
      <header className={styles.topBar}>
        <span className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <Icon name="grid-1x2" />
          </span>
          {env.appName}
        </span>
        <ThemeSwitcher />
      </header>
      <main id="main-content" className={styles.main}>
        <Suspense fallback={<FullPageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className={styles.footer}>
        © {new Date().getFullYear()} {env.appName}
      </footer>
    </div>
  );
}

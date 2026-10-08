import { Suspense } from 'react';
import { Outlet } from 'react-router';

import { FullPageLoader } from '@/components/ui/LoadingSpinner';
import { SidebarProvider } from '@/store/SidebarProvider';
import { useSidebar } from '@/store/useSidebar';
import clsx from '@/utils/clsx';

import { AppFooter } from './AppFooter';
import { AppHeader } from './AppHeader';
import styles from './AppLayout.module.css';
import { AppSidebar } from './AppSidebar';

function AppShell() {
  const { isCollapsed } = useSidebar();
  return (
    <div className={clsx(styles.layout, isCollapsed && styles.collapsed)}>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <AppHeader />
      <div className={styles.body}>
        <AppSidebar />
        <div className={styles.main}>
          <main id="main-content" className={styles.content} tabIndex={-1}>
            <Suspense fallback={<FullPageLoader label="Loading page…" />}>
              <Outlet />
            </Suspense>
          </main>
          <AppFooter />
        </div>
      </div>
    </div>
  );
}

/** Authenticated application shell: header, collapsible sidebar, main content and footer. */
export function AppLayout() {
  return (
    <SidebarProvider>
      <AppShell />
    </SidebarProvider>
  );
}

import Offcanvas from 'react-bootstrap/Offcanvas';
import { NavLink } from 'react-router';

import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/features/auth/useAuth';
import { getVisibleNavSections } from '@/layouts/navigation';
import { useSidebar } from '@/store/useSidebar';
import clsx from '@/utils/clsx';
import { env } from '@/utils/env';

import styles from './AppLayout.module.css';

/**
 * Permission-aware navigation. Static rail on large screens (collapsible to icons); off-canvas
 * drawer below the lg breakpoint.
 */
export function AppSidebar() {
  const { hasPermission } = useAuth();
  const { isMobileOpen, closeMobile } = useSidebar();
  const sections = getVisibleNavSections(hasPermission);

  return (
    <aside className={styles.sidebar}>
      <Offcanvas
        id="app-sidebar"
        show={isMobileOpen}
        onHide={closeMobile}
        responsive="lg"
        placement="start"
        aria-label="Main navigation"
        className={styles.offcanvas}
      >
        <Offcanvas.Header closeButton closeLabel="Close navigation menu">
          <Offcanvas.Title as="h2" className="fs-5">
            {env.appName}
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className={styles.sidebarBody}>
          <nav aria-label="Main" className={styles.nav}>
            {sections.map((section) => (
              <div key={section.id} className={styles.navSection}>
                {section.title && <p className={styles.navSectionTitle}>{section.title}</p>}
                <ul className={styles.navList}>
                  {section.items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        title={item.label}
                        onClick={closeMobile}
                        className={({ isActive }) =>
                          clsx(styles.navLink, isActive && styles.active)
                        }
                      >
                        <Icon name={item.icon} className={styles.navIcon} />
                        <span className={styles.navLabel}>{item.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </Offcanvas.Body>
      </Offcanvas>
    </aside>
  );
}

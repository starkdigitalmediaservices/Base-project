import { env } from '@/utils/env';

import styles from './AppLayout.module.css';

export function AppFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className={styles.footer}>
      <span>
        © {year} {env.appName}
      </span>
      <span className={styles.footerMeta}>React · Bootstrap · FastAPI · PostgreSQL</span>
    </footer>
  );
}

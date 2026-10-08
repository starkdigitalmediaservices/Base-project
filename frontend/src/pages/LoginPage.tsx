import { AppCard } from '@/components/ui/AppCard';
import { LoginForm } from '@/features/auth/LoginForm';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { env } from '@/utils/env';

import styles from './LoginPage.module.css';

export function LoginPage() {
  useDocumentTitle('Sign in');
  return (
    <div className={styles.wrapper}>
      <AppCard>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.subtitle}>Welcome to {env.appName}. Use your account to continue.</p>
        <LoginForm />
      </AppCard>
    </div>
  );
}

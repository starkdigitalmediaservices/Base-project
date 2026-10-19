import Alert from 'react-bootstrap/Alert';

import { AppCard } from '@/components/ui/AppCard';
import { LoginForm } from '@/features/auth/LoginForm';
import { useAuth } from '@/features/auth/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { env } from '@/utils/env';

import styles from './LoginPage.module.css';

export function LoginPage() {
  useDocumentTitle('Sign in');
  const { endReason } = useAuth();

  return (
    <div className={styles.wrapper}>
      <AppCard>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.subtitle}>Welcome to {env.appName}. Use your account to continue.</p>
        {endReason === 'expired' && (
          <Alert variant="warning" className="mb-3">
            Your session has expired. Please sign in again.
          </Alert>
        )}
        <LoginForm />
      </AppCard>
    </div>
  );
}

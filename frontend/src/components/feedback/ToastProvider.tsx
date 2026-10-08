import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import Toast from 'react-bootstrap/Toast';
import ToastContainer from 'react-bootstrap/ToastContainer';

import { Icon, type IconName } from '@/components/ui/Icon';
import clsx from '@/utils/clsx';

import {
  ToastContext,
  type ToastContextValue,
  type ToastOptions,
  type ToastVariant,
} from './toastContext';
import styles from './ToastProvider.module.css';

interface ToastItem extends Required<Omit<ToastOptions, 'title'>> {
  id: number;
  title?: string;
}

const ICONS: Record<ToastVariant, IconName> = {
  success: 'check-circle',
  danger: 'exclamation-octagon',
  warning: 'exclamation-triangle',
  info: 'info-circle',
};

const DEFAULT_TITLES: Record<ToastVariant, string> = {
  success: 'Success',
  danger: 'Error',
  warning: 'Warning',
  info: 'Notice',
};

const MAX_TOASTS = 4;

/** App-wide toast notifications. Use `useToast().showToast(...)`. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((options: ToastOptions) => {
    const variant = options.variant ?? 'info';
    const toast: ToastItem = {
      id: nextId.current++,
      variant,
      title: options.title,
      message: options.message,
      durationMs: options.durationMs ?? (variant === 'danger' ? 0 : 5000),
    };
    setToasts((current) => [...current, toast].slice(-MAX_TOASTS));
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({ showToast, dismissToast }),
    [showToast, dismissToast],
  );

  return (
    <ToastContext value={value}>
      {children}
      <ToastContainer
        position="bottom-end"
        containerPosition="fixed"
        className={clsx('p-3', styles.container)}
      >
        {toasts.map((toast) => {
          const isError = toast.variant === 'danger';
          return (
            <Toast
              key={toast.id}
              onClose={() => dismissToast(toast.id)}
              autohide={toast.durationMs > 0}
              delay={toast.durationMs > 0 ? toast.durationMs : undefined}
              className={clsx(styles.toast, styles[toast.variant])}
              role={isError ? 'alert' : 'status'}
              aria-live={isError ? 'assertive' : 'polite'}
            >
              <Toast.Header closeLabel="Dismiss notification">
                <Icon name={ICONS[toast.variant]} className={clsx('me-2', styles.icon)} />
                <strong className="me-auto">{toast.title ?? DEFAULT_TITLES[toast.variant]}</strong>
              </Toast.Header>
              <Toast.Body>{toast.message}</Toast.Body>
            </Toast>
          );
        })}
      </ToastContainer>
    </ToastContext>
  );
}

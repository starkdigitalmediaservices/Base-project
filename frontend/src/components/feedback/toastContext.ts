import { createContext } from 'react';

export type ToastVariant = 'success' | 'danger' | 'warning' | 'info';

export interface ToastOptions {
  variant?: ToastVariant;
  title?: string;
  message: string;
  /** Auto-dismiss delay in ms; 0 keeps the toast until closed. Errors default to 0. */
  durationMs?: number;
}

export interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  dismissToast: (id: number) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

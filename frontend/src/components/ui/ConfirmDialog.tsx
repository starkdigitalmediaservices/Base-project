import type { ReactNode } from 'react';

import { AppButton } from './AppButton';
import { AppModal } from './AppModal';

interface ConfirmDialogProps {
  show: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'warning';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation step for destructive or important actions. */
export function ConfirmDialog({
  show,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AppModal
      show={show}
      onHide={isLoading ? () => undefined : onCancel}
      title={title}
      staticBackdrop={isLoading}
      footer={
        <>
          <AppButton variant="outline-secondary" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </AppButton>
          <AppButton variant={variant} onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </AppButton>
        </>
      }
    >
      {message}
    </AppModal>
  );
}

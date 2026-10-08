import Alert from 'react-bootstrap/Alert';

import { Icon } from '@/components/ui/Icon';

interface FormErrorAlertProps {
  message?: string | null;
  title?: string;
  onClose?: () => void;
}

/** Form-level error (non-field API errors, unknown validation fields, network failures). */
export function FormErrorAlert({ message, title, onClose }: FormErrorAlertProps) {
  if (!message) return null;
  return (
    <Alert variant="danger" dismissible={Boolean(onClose)} onClose={onClose} role="alert">
      <div className="d-flex gap-2">
        <Icon name="exclamation-octagon" className="mt-1" />
        <div>
          {title && <strong className="d-block">{title}</strong>}
          {message}
        </div>
      </div>
    </Alert>
  );
}

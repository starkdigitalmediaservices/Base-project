import { type ReactNode, useId } from 'react';
import Modal from 'react-bootstrap/Modal';

interface AppModalProps {
  show: boolean;
  onHide: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'lg' | 'xl';
  /** Prevent closing by clicking the backdrop (e.g. while a form is dirty or submitting). */
  staticBackdrop?: boolean;
  fullscreenOnMobile?: boolean;
}

/** Accessible modal dialog: labelled by its title, focus-trapped, Escape to close. */
export function AppModal({
  show,
  onHide,
  title,
  children,
  footer,
  size,
  staticBackdrop = false,
  fullscreenOnMobile = false,
}: AppModalProps) {
  const titleId = useId();
  return (
    <Modal
      show={show}
      onHide={onHide}
      size={size}
      centered
      aria-labelledby={titleId}
      backdrop={staticBackdrop ? 'static' : true}
      keyboard={!staticBackdrop}
      fullscreen={fullscreenOnMobile ? 'sm-down' : undefined}
    >
      <Modal.Header closeButton>
        <Modal.Title id={titleId} as="h2" className="fs-5">
          {title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>{children}</Modal.Body>
      {footer && <Modal.Footer>{footer}</Modal.Footer>}
    </Modal>
  );
}

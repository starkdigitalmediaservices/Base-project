import { useState } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import Tooltip from 'react-bootstrap/Tooltip';

import { useToast } from '@/components/feedback/useToast';
import { AppButton } from '@/components/ui/AppButton';
import { AppModal } from '@/components/ui/AppModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Icon } from '@/components/ui/Icon';
import { useDisclosure } from '@/hooks/useDisclosure';

import styles from '../Showcase.module.css';
import { DemoBlock, ShowcaseSection } from '../ShowcaseSection';

export function OverlaysSection() {
  const modal = useDisclosure();
  const confirm = useDisclosure();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = () => {
    setIsDeleting(true);
    window.setTimeout(() => {
      setIsDeleting(false);
      confirm.close();
      showToast({ variant: 'success', message: 'Item deleted (demo).' });
    }, 1000);
  };

  return (
    <ShowcaseSection
      id="overlays"
      title="Overlays"
      description="Modals, confirmation dialogs, dropdowns, tooltips and popovers."
    >
      <DemoBlock title="Modal & confirmation">
        <div className={styles.row}>
          <AppButton onClick={modal.open}>Open modal</AppButton>
          <AppButton variant="outline-danger" icon="trash" onClick={confirm.open}>
            Delete item
          </AppButton>
        </div>
        <AppModal
          show={modal.isOpen}
          onHide={modal.close}
          title="Example modal"
          footer={
            <>
              <AppButton variant="outline-secondary" onClick={modal.close}>
                Close
              </AppButton>
              <AppButton onClick={modal.close}>Save</AppButton>
            </>
          }
        >
          Focus is trapped inside the dialog and returns to the trigger when it closes. Press Escape
          to close.
        </AppModal>
        <ConfirmDialog
          show={confirm.isOpen}
          title="Delete item?"
          message="This permanently deletes the item. This action cannot be undone."
          confirmLabel="Delete"
          isLoading={isDeleting}
          onConfirm={handleConfirm}
          onCancel={confirm.close}
        />
      </DemoBlock>
      <DemoBlock title="Dropdown">
        <Dropdown>
          <Dropdown.Toggle variant="outline-secondary" id="showcase-dropdown">
            Options
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item as="button">
              <Icon name="pencil" className="me-2" />
              Edit
            </Dropdown.Item>
            <Dropdown.Item as="button">
              <Icon name="download" className="me-2" />
              Download
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item as="button" className="text-danger">
              <Icon name="trash" className="me-2" />
              Delete
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </DemoBlock>
      <DemoBlock title="Tooltip & popover">
        <div className={styles.row}>
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip id="showcase-tooltip">Tooltips describe controls</Tooltip>}
          >
            <AppButton variant="outline-secondary">Hover or focus me</AppButton>
          </OverlayTrigger>
          <OverlayTrigger
            trigger="click"
            placement="right"
            rootClose
            overlay={
              <Popover id="showcase-popover">
                <Popover.Header as="h4">Popover title</Popover.Header>
                <Popover.Body>Popovers hold richer content. Click outside to close.</Popover.Body>
              </Popover>
            }
          >
            <AppButton variant="outline-primary">Click for popover</AppButton>
          </OverlayTrigger>
        </div>
      </DemoBlock>
    </ShowcaseSection>
  );
}

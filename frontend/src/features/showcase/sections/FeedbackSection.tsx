import { useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

import { useToast } from '@/components/feedback/useToast';
import { AppButton } from '@/components/ui/AppButton';
import { Icon } from '@/components/ui/Icon';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState, SuccessState, WarningState } from '@/components/ui/StateMessage';
import { ApiError } from '@/services/apiError';

import styles from '../Showcase.module.css';
import { DemoBlock, ShowcaseSection } from '../ShowcaseSection';

const ALERTS = [
  { variant: 'success', icon: 'check-circle', text: 'Changes saved successfully.' },
  { variant: 'info', icon: 'info-circle', text: 'A new version is available.' },
  { variant: 'warning', icon: 'exclamation-triangle', text: 'Your trial ends in 3 days.' },
  { variant: 'danger', icon: 'exclamation-octagon', text: 'We could not process the request.' },
] as const;

const DEMO_ERROR = new ApiError({
  status: 503,
  code: 'service_unavailable',
  message: 'The service is temporarily unavailable.',
  requestId: 'demo-1234',
});

export function FeedbackSection() {
  const { showToast } = useToast();
  const [showDismissible, setShowDismissible] = useState(true);

  return (
    <ShowcaseSection
      id="feedback"
      title="Feedback"
      description="Alerts, toasts, loaders, skeletons and empty/error/success/warning states."
    >
      <DemoBlock title="Alerts">
        {ALERTS.map((alert) => (
          <Alert
            key={alert.variant}
            variant={alert.variant}
            className="d-flex gap-2 align-items-start"
          >
            <Icon name={alert.icon} className="mt-1" />
            <span>{alert.text}</span>
          </Alert>
        ))}
        {showDismissible ? (
          <Alert
            variant="primary"
            dismissible
            onClose={() => setShowDismissible(false)}
            closeLabel="Dismiss alert"
          >
            Dismissible alert — press the close button.
          </Alert>
        ) : (
          <AppButton size="sm" variant="outline-primary" onClick={() => setShowDismissible(true)}>
            Show dismissible alert again
          </AppButton>
        )}
      </DemoBlock>
      <DemoBlock title="Toasts">
        <div className={styles.row}>
          <AppButton
            variant="outline-success"
            onClick={() => showToast({ variant: 'success', message: 'Record saved.' })}
          >
            Success toast
          </AppButton>
          <AppButton
            variant="outline-info"
            onClick={() =>
              showToast({ variant: 'info', message: 'Heads up: maintenance tonight.' })
            }
          >
            Info toast
          </AppButton>
          <AppButton
            variant="outline-warning"
            onClick={() => showToast({ variant: 'warning', message: 'Storage is almost full.' })}
          >
            Warning toast
          </AppButton>
          <AppButton
            variant="outline-danger"
            onClick={() =>
              showToast({
                variant: 'danger',
                message: 'Upload failed. Errors stay until dismissed.',
              })
            }
          >
            Error toast
          </AppButton>
        </div>
      </DemoBlock>
      <DemoBlock title="Spinners & skeletons">
        <div className={`${styles.row} mb-3`}>
          <LoadingSpinner size="sm" />
          <LoadingSpinner />
          <LoadingSpinner label="Loading reports…" showLabel />
        </div>
        <div className={styles.skeletonCard}>
          <Skeleton variant="circle" />
          <span className={styles.skeletonText}>
            <Skeleton lines={3} />
          </span>
        </div>
      </DemoBlock>
      <DemoBlock title="States">
        <Row xs={1} md={2} className="g-3">
          <Col>
            <EmptyState
              compact
              title="No projects yet"
              description="Create your first project to get started."
            />
          </Col>
          <Col>
            <ErrorState
              compact
              error={DEMO_ERROR}
              onRetry={() => showToast({ variant: 'info', message: 'Retrying (demo)…' })}
            />
          </Col>
          <Col>
            <SuccessState
              compact
              title="All done"
              description="Your import finished without errors."
            />
          </Col>
          <Col>
            <WarningState
              compact
              title="Partial results"
              description="Some sources could not be reached."
            />
          </Col>
        </Row>
      </DemoBlock>
    </ShowcaseSection>
  );
}

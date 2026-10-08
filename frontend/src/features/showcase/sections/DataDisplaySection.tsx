import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

import sampleImage from '@/assets/sample-landscape.svg';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { Avatar } from '@/components/ui/Avatar';
import { ResponsiveImage } from '@/components/ui/ResponsiveImage';
import { type Status, StatusBadge } from '@/components/ui/StatusBadge';

import styles from '../Showcase.module.css';
import { DemoBlock, ShowcaseSection } from '../ShowcaseSection';

const BADGE_VARIANTS = [
  'primary',
  'secondary',
  'accent',
  'success',
  'warning',
  'danger',
  'info',
] as const;
const STATUSES: Status[] = ['active', 'inactive', 'pending', 'success', 'warning', 'error', 'info'];

export function DataDisplaySection() {
  return (
    <ShowcaseSection
      id="data-display"
      title="Data display"
      description="Cards, badges, statuses, avatars and images."
    >
      <DemoBlock title="Cards">
        <Row xs={1} md={2} xl={3} className="g-3">
          <Col>
            <AppCard title="Basic card" subtitle="With a subtitle" titleAs="h4">
              Cards group related content on a surface.
            </AppCard>
          </Col>
          <Col>
            <AppCard
              title="With actions"
              titleAs="h4"
              actions={
                <AppButton size="sm" variant="outline-primary">
                  Action
                </AppButton>
              }
              footer={<small className="text-body-secondary">Updated 5 minutes ago</small>}
            >
              Header actions and a footer.
            </AppCard>
          </Col>
          <Col>
            <AppCard title="Image card" titleAs="h4">
              <ResponsiveImage
                src={sampleImage}
                alt="Illustrated mountain landscape"
                ratio="16x9"
              />
            </AppCard>
          </Col>
        </Row>
      </DemoBlock>
      <DemoBlock title="Badges">
        <div className={styles.row}>
          {BADGE_VARIANTS.map((variant) => (
            <span key={variant} className={`badge text-bg-${variant}`}>
              {variant}
            </span>
          ))}
          <span className="badge rounded-pill text-bg-primary">pill</span>
        </div>
      </DemoBlock>
      <DemoBlock title="Status displays">
        <div className={styles.row}>
          {STATUSES.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </div>
      </DemoBlock>
      <DemoBlock title="Avatars">
        <div className={styles.row}>
          <Avatar name="Jane Doe" size="sm" />
          <Avatar name="Rahul Sharma" size="md" />
          <Avatar name="Ada Lovelace" size="lg" />
          <Avatar name="Landscape" src={sampleImage} size="lg" />
        </div>
      </DemoBlock>
      <DemoBlock title="Responsive images">
        <Row xs={1} md={3} className="g-3">
          <Col>
            <ResponsiveImage src={sampleImage} alt="Landscape in 1:1" ratio="1x1" caption="1:1" />
          </Col>
          <Col>
            <ResponsiveImage src={sampleImage} alt="Landscape in 4:3" ratio="4x3" caption="4:3" />
          </Col>
          <Col>
            <ResponsiveImage
              src={sampleImage}
              alt="Landscape in 21:9"
              ratio="21x9"
              caption="21:9"
            />
          </Col>
        </Row>
      </DemoBlock>
    </ShowcaseSection>
  );
}

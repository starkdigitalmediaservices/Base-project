import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';

import { Icon } from '@/components/ui/Icon';

import styles from '../Showcase.module.css';
import { DemoBlock, ShowcaseSection } from '../ShowcaseSection';

const BREAKPOINTS = [
  { label: 'Mobile (< 576px)', className: 'd-inline-flex d-sm-none' },
  { label: 'Large mobile (sm ≥ 576px)', className: 'd-none d-sm-inline-flex d-md-none' },
  { label: 'Tablet (md ≥ 768px)', className: 'd-none d-md-inline-flex d-lg-none' },
  { label: 'Desktop (lg ≥ 992px)', className: 'd-none d-lg-inline-flex d-xl-none' },
  { label: 'Wide desktop (xl ≥ 1200px)', className: 'd-none d-xl-inline-flex d-xxl-none' },
  { label: 'Large screen (xxl ≥ 1400px)', className: 'd-none d-xxl-inline-flex' },
];

export function LayoutSection() {
  return (
    <ShowcaseSection
      id="layout"
      title="Responsive layout"
      description="Bootstrap containers and the 12-column grid; resize the window to see columns reflow."
    >
      <DemoBlock title="Current breakpoint">
        {BREAKPOINTS.map((breakpoint) => (
          <span key={breakpoint.label} className={`${breakpoint.className} ${styles.breakpoint}`}>
            <Icon name="grid-1x2" />
            {breakpoint.label}
          </span>
        ))}
      </DemoBlock>
      <DemoBlock title="Grid">
        <Container fluid className="px-0">
          <Row className="g-2">
            {Array.from({ length: 6 }, (_, index) => (
              <Col key={index} xs={12} sm={6} lg={4} xxl={2}>
                <div className={styles.gridCell}>xs 12 · sm 6 · lg 4 · xxl 2</div>
              </Col>
            ))}
          </Row>
        </Container>
      </DemoBlock>
    </ShowcaseSection>
  );
}

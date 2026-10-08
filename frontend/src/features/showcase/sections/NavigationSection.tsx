import { useState } from 'react';
import Accordion from 'react-bootstrap/Accordion';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';

import { PaginationControls } from '@/components/ui/PaginationControls';

import { DemoBlock, ShowcaseSection } from '../ShowcaseSection';

export function NavigationSection() {
  const [page, setPage] = useState(4);
  return (
    <ShowcaseSection
      id="navigation"
      title="Navigation"
      description="Tabs, accordions, breadcrumbs and pagination."
    >
      <DemoBlock title="Tabs">
        <Tabs defaultActiveKey="overview" id="showcase-tabs" className="mb-3">
          <Tab eventKey="overview" title="Overview">
            Tabs switch between related views without leaving the page (arrow keys move focus).
          </Tab>
          <Tab eventKey="activity" title="Activity">
            Recent activity would appear here.
          </Tab>
          <Tab eventKey="settings" title="Settings">
            Settings content.
          </Tab>
        </Tabs>
      </DemoBlock>
      <DemoBlock title="Accordion">
        <Accordion defaultActiveKey="0">
          <Accordion.Item eventKey="0">
            <Accordion.Header>What is this base project?</Accordion.Header>
            <Accordion.Body>
              A reusable React + FastAPI foundation with auth, theming and tables.
            </Accordion.Body>
          </Accordion.Item>
          <Accordion.Item eventKey="1">
            <Accordion.Header>Where do I add business features?</Accordion.Header>
            <Accordion.Body>
              Create a folder in <code>src/features/</code>, a page in <code>src/pages/</code>, and
              a route in <code>src/routes/router.tsx</code>.
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </DemoBlock>
      <DemoBlock title="Breadcrumb">
        <nav aria-label="Example breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item">
              <a href="#navigation">Home</a>
            </li>
            <li className="breadcrumb-item">
              <a href="#navigation">Administration</a>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              Users
            </li>
          </ol>
        </nav>
      </DemoBlock>
      <DemoBlock title="Pagination">
        <p className="small text-body-secondary">
          Page {page} of 20 (client-side demo; data tables use backend pagination metadata).
        </p>
        <PaginationControls
          page={page}
          totalPages={20}
          onPageChange={setPage}
          label="Demo pagination"
        />
      </DemoBlock>
    </ShowcaseSection>
  );
}

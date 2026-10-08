import { useState } from 'react';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

import { CheckboxField, SwitchField } from '@/components/forms/CheckboxField';
import { DateField } from '@/components/forms/DateField';
import { FileField } from '@/components/forms/FileField';
import { RadioGroupField } from '@/components/forms/RadioGroupField';
import { SearchInput } from '@/components/forms/SearchInput';
import { SelectField } from '@/components/forms/SelectField';
import { TextAreaField } from '@/components/forms/TextAreaField';
import { TextField } from '@/components/forms/TextField';

import { DemoBlock, ShowcaseSection } from '../ShowcaseSection';

const COUNTRY_OPTIONS = [
  { value: 'in', label: 'India' },
  { value: 'gb', label: 'United Kingdom' },
  { value: 'us', label: 'United States' },
];

const PLAN_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise', disabled: true },
];

export function FormControlsSection() {
  const [search, setSearch] = useState('');
  return (
    <ShowcaseSection
      id="form-controls"
      title="Form controls"
      description="Every control has a label, help text, error state, and disabled/read-only variants."
    >
      <DemoBlock title="Inputs">
        <Row className="g-3">
          <Col md={6}>
            <TextField
              label="Text"
              placeholder="Jane Doe"
              helpText="Help text explains the field."
            />
            <TextField label="Email" type="email" placeholder="jane@example.com" />
            <TextField label="Password" type="password" autoComplete="new-password" />
            <TextField label="Number" type="number" min={0} defaultValue={3} />
            <DateField label="Date" />
          </Col>
          <Col md={6}>
            <SelectField label="Select" placeholder="Choose a country" options={COUNTRY_OPTIONS} />
            <TextAreaField label="Textarea" placeholder="Write a short note…" />
            <FileField label="File" accept=".pdf,.png,.jpg" helpText="PDF, PNG or JPG." />
            <div className="mb-3">
              <span className="form-label d-block">Search</span>
              <SearchInput value={search} onChange={setSearch} label="Search demo" />
            </div>
          </Col>
        </Row>
      </DemoBlock>
      <DemoBlock title="Choices">
        <Row className="g-3">
          <Col md={4}>
            <CheckboxField label="Checkbox" defaultChecked />
            <CheckboxField label="Disabled checkbox" disabled />
          </Col>
          <Col md={4}>
            <SwitchField label="Email notifications" defaultChecked />
            <SwitchField label="Disabled switch" disabled />
          </Col>
          <Col md={4}>
            <RadioGroupField
              legend="Plan"
              name="showcase-plan"
              options={PLAN_OPTIONS}
              defaultValue="free"
            />
          </Col>
        </Row>
      </DemoBlock>
      <DemoBlock title="States">
        <Row className="g-3">
          <Col md={4}>
            <TextField label="Disabled" value="Not editable" disabled readOnly />
          </Col>
          <Col md={4}>
            <TextField label="Read-only" value="Read-only value" readOnly />
          </Col>
          <Col md={4}>
            <TextField label="Invalid" defaultValue="bad@" error="Enter a valid email address." />
          </Col>
        </Row>
      </DemoBlock>
    </ShowcaseSection>
  );
}

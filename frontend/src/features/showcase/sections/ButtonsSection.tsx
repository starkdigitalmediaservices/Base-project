import { useState } from 'react';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import ToggleButton from 'react-bootstrap/ToggleButton';
import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup';

import { AppButton } from '@/components/ui/AppButton';

import styles from '../Showcase.module.css';
import { DemoBlock, ShowcaseSection } from '../ShowcaseSection';

const VARIANTS = [
  'primary',
  'secondary',
  'accent',
  'success',
  'warning',
  'danger',
  'info',
] as const;

export function ButtonsSection() {
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState('list');

  const simulateLoading = () => {
    setIsLoading(true);
    window.setTimeout(() => setIsLoading(false), 1500);
  };

  return (
    <ShowcaseSection id="buttons" title="Buttons" description="Variants, sizes, states and groups.">
      <DemoBlock title="Solid">
        <div className={styles.row}>
          {VARIANTS.map((variant) => (
            <AppButton key={variant} variant={variant}>
              {variant}
            </AppButton>
          ))}
          <AppButton variant="link">link</AppButton>
        </div>
      </DemoBlock>
      <DemoBlock title="Outline">
        <div className={styles.row}>
          {VARIANTS.map((variant) => (
            <AppButton key={variant} variant={`outline-${variant}`}>
              {variant}
            </AppButton>
          ))}
        </div>
      </DemoBlock>
      <DemoBlock title="Sizes, icons and states">
        <div className={styles.row}>
          <AppButton size="sm" icon="plus-lg">
            Small
          </AppButton>
          <AppButton icon="download">Default</AppButton>
          <AppButton size="lg">Large</AppButton>
          <AppButton disabled>Disabled</AppButton>
          <AppButton isLoading={isLoading} loadingText="Saving…" onClick={simulateLoading}>
            Click to load
          </AppButton>
          <AppButton variant="outline-secondary" icon="pencil" aria-label="Edit (icon only)" />
        </div>
      </DemoBlock>
      <DemoBlock title="Button groups">
        <div className={styles.row}>
          <ButtonGroup aria-label="Text alignment">
            <AppButton variant="outline-secondary">Left</AppButton>
            <AppButton variant="outline-secondary">Center</AppButton>
            <AppButton variant="outline-secondary">Right</AppButton>
          </ButtonGroup>
          <ToggleButtonGroup
            type="radio"
            name="view-mode"
            value={view}
            onChange={(value: string) => setView(value)}
            aria-label="View mode"
          >
            <ToggleButton id="view-list" value="list" variant="outline-primary">
              List
            </ToggleButton>
            <ToggleButton id="view-grid" value="grid" variant="outline-primary">
              Grid
            </ToggleButton>
          </ToggleButtonGroup>
        </div>
      </DemoBlock>
    </ShowcaseSection>
  );
}

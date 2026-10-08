import { PageHeader } from '@/components/ui/PageHeader';
import styles from '@/features/showcase/Showcase.module.css';
import { ButtonsSection } from '@/features/showcase/sections/ButtonsSection';
import { DataDisplaySection } from '@/features/showcase/sections/DataDisplaySection';
import { FeedbackSection } from '@/features/showcase/sections/FeedbackSection';
import { FormControlsSection } from '@/features/showcase/sections/FormControlsSection';
import { FormValidationDemo } from '@/features/showcase/sections/FormValidationDemo';
import { LayoutSection } from '@/features/showcase/sections/LayoutSection';
import { NavigationSection } from '@/features/showcase/sections/NavigationSection';
import { OverlaysSection } from '@/features/showcase/sections/OverlaysSection';
import { ThemeSection } from '@/features/showcase/sections/ThemeSection';

const SECTIONS = [
  { id: 'theme', label: 'Theme & tokens' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'form-controls', label: 'Form controls' },
  { id: 'form-validation', label: 'Form validation' },
  { id: 'data-display', label: 'Data display' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'overlays', label: 'Overlays' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'layout', label: 'Responsive layout' },
];

/** Living style guide: every reusable component in one place. */
export function ComponentShowcasePage() {
  return (
    <>
      <PageHeader
        title="Component library"
        description="Reusable, accessible building blocks styled by the design tokens. Demo content only."
      />
      <div className={styles.layout}>
        <nav aria-label="Component sections" className={styles.toc}>
          <ul className={styles.tocList}>
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className={styles.tocLink}>
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.sections}>
          <ThemeSection />
          <ButtonsSection />
          <FormControlsSection />
          <FormValidationDemo />
          <DataDisplaySection />
          <FeedbackSection />
          <OverlaysSection />
          <NavigationSection />
          <LayoutSection />
        </div>
      </div>
    </>
  );
}

import clsx from '@/utils/clsx';
import { useTheme } from '@/theme/useTheme';

import styles from '../Showcase.module.css';
import { DemoBlock, ShowcaseSection } from '../ShowcaseSection';

const SWATCHES = [
  { token: '--app-color-primary', className: styles.primary },
  { token: '--app-color-secondary', className: styles.secondary },
  { token: '--app-color-accent', className: styles.accent },
  { token: '--app-color-success', className: styles.success },
  { token: '--app-color-warning', className: styles.warning },
  { token: '--app-color-danger', className: styles.danger },
  { token: '--app-color-info', className: styles.info },
  { token: '--app-color-background', className: styles.background },
  { token: '--app-color-surface', className: styles.surface },
  { token: '--app-color-surface-muted', className: styles.surfaceMuted },
  { token: '--app-color-border', className: styles.border },
  { token: '--app-color-text', className: styles.text },
  { token: '--app-color-text-muted', className: styles.textMuted },
];

export function ThemeSection() {
  const { resolvedTheme, toggleTheme } = useTheme();
  return (
    <ShowcaseSection
      id="theme"
      title="Theme & tokens"
      description={
        <>
          All colours come from <code>src/theme/tokens.css</code>. Current mode:{' '}
          <strong>{resolvedTheme}</strong>.{' '}
          <button
            type="button"
            className="btn btn-link btn-sm p-0 align-baseline"
            onClick={toggleTheme}
          >
            Toggle theme
          </button>
        </>
      }
    >
      <DemoBlock title="Colour tokens">
        <ul className={clsx(styles.swatches, 'list-unstyled mb-0')}>
          {SWATCHES.map((swatch) => (
            <li key={swatch.token} className={styles.swatch}>
              <span className={clsx(styles.swatchColor, swatch.className)} aria-hidden="true" />
              <span className={styles.swatchLabel}>{swatch.token}</span>
            </li>
          ))}
        </ul>
      </DemoBlock>
      <DemoBlock title="Typography scale">
        <div className={styles.typeScale}>
          <p className={styles.text2xl}>2xl — Page titles</p>
          <p className={styles.textXl}>xl — Section headings</p>
          <p className={styles.textLg}>lg — Card titles</p>
          <p className={styles.textBase}>base — Body copy that stays comfortable to read.</p>
          <p className={styles.textSm}>sm — Secondary text and table cells</p>
          <p className={styles.textXs}>xs — Captions and labels</p>
          <p className="mb-0">
            Inline <code>code</code>, <kbd>Ctrl</kbd> + <kbd>K</kbd>, <a href="#theme">a link</a>,{' '}
            <strong>bold</strong> and <em>emphasis</em>.
          </p>
        </div>
      </DemoBlock>
    </ShowcaseSection>
  );
}

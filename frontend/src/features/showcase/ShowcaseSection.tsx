import type { ReactNode } from 'react';

import { AppCard } from '@/components/ui/AppCard';

import styles from './Showcase.module.css';

interface ShowcaseSectionProps {
  id: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

export function ShowcaseSection({ id, title, description, children }: ShowcaseSectionProps) {
  return (
    <section id={id} className={styles.section} aria-label={title}>
      <AppCard title={title} subtitle={description}>
        {children}
      </AppCard>
    </section>
  );
}

export function DemoBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.block}>
      <h3 className={styles.blockTitle}>{title}</h3>
      {children}
    </div>
  );
}

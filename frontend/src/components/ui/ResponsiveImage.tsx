import clsx from '@/utils/clsx';

import styles from './ResponsiveImage.module.css';

interface ResponsiveImageProps {
  src: string;
  /** Required. Use alt="" only for purely decorative images. */
  alt: string;
  ratio?: '1x1' | '4x3' | '16x9' | '21x9';
  caption?: string;
  rounded?: boolean;
  className?: string;
}

/** Lazy-loaded image locked to an aspect ratio so layouts don't jump while loading. */
export function ResponsiveImage({
  src,
  alt,
  ratio = '16x9',
  caption,
  rounded = true,
  className,
}: ResponsiveImageProps) {
  return (
    <figure className={clsx('mb-0', className)}>
      <div className={clsx('ratio', `ratio-${ratio}`, styles.frame, rounded && styles.rounded)}>
        <img src={src} alt={alt} loading="lazy" decoding="async" className={styles.image} />
      </div>
      {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </figure>
  );
}

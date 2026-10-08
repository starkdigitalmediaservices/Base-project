import clsx from '@/utils/clsx';

/**
 * Icon names come from Bootstrap Icons (https://icons.getbootstrap.com). Extend this union when you
 * need a new icon so usages stay type-checked.
 */
export type IconName =
  | 'arrow-clockwise'
  | 'arrow-down'
  | 'arrow-down-up'
  | 'arrow-up'
  | 'box-arrow-right'
  | 'check-circle'
  | 'chevron-double-left'
  | 'chevron-double-right'
  | 'circle-half'
  | 'download'
  | 'exclamation-octagon'
  | 'exclamation-triangle'
  | 'funnel'
  | 'grid-1x2'
  | 'house'
  | 'inbox'
  | 'info-circle'
  | 'list'
  | 'moon-stars'
  | 'palette'
  | 'pencil'
  | 'person'
  | 'person-check'
  | 'person-circle'
  | 'person-x'
  | 'people'
  | 'plus-lg'
  | 'search'
  | 'shield-check'
  | 'shield-lock'
  | 'sun'
  | 'three-dots-vertical'
  | 'trash'
  | 'x-circle'
  | 'x-lg';

interface IconProps {
  name: IconName;
  className?: string;
  /** Provide a label only when the icon conveys meaning on its own (no visible text next to it). */
  label?: string;
}

export function Icon({ name, className, label }: IconProps) {
  if (label) {
    return <i className={clsx('bi', `bi-${name}`, className)} role="img" aria-label={label} />;
  }
  return <i className={clsx('bi', `bi-${name}`, className)} aria-hidden="true" />;
}

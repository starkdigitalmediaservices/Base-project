import type { ComponentPropsWithRef, ReactNode } from 'react';

import clsx from '@/utils/clsx';

import { FieldMessages, RequiredMark } from './FieldMessages';
import { useFieldIds } from './useFieldIds';

export interface TextFieldProps extends Omit<ComponentPropsWithRef<'input'>, 'size'> {
  label: string;
  error?: string;
  helpText?: ReactNode;
  /** Keep the label for screen readers but hide it visually. */
  hideLabel?: boolean;
  size?: 'sm' | 'lg';
  /** Class for the wrapper element (spacing, grid). */
  wrapperClassName?: string;
}

/** Text-like input (text, email, password, number, date, …) wired for react-hook-form. */
export function TextField({
  label,
  error,
  helpText,
  hideLabel = false,
  size,
  wrapperClassName = 'mb-3',
  id,
  className,
  required,
  ...inputProps
}: TextFieldProps) {
  const ids = useFieldIds(id, Boolean(helpText), Boolean(error));
  return (
    <div className={wrapperClassName}>
      <label htmlFor={ids.inputId} className={clsx('form-label', hideLabel && 'visually-hidden')}>
        {label}
        {required && <RequiredMark />}
      </label>
      <input
        id={ids.inputId}
        className={clsx(
          'form-control',
          size && `form-control-${size}`,
          error && 'is-invalid',
          className,
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        aria-required={required || undefined}
        {...inputProps}
      />
      <FieldMessages error={error} errorId={ids.errorId} helpText={helpText} helpId={ids.helpId} />
    </div>
  );
}

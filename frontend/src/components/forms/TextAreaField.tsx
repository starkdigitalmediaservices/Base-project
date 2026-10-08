import type { ComponentPropsWithRef, ReactNode } from 'react';

import clsx from '@/utils/clsx';

import { FieldMessages, RequiredMark } from './FieldMessages';
import { useFieldIds } from './useFieldIds';

export interface TextAreaFieldProps extends ComponentPropsWithRef<'textarea'> {
  label: string;
  error?: string;
  helpText?: ReactNode;
  hideLabel?: boolean;
  wrapperClassName?: string;
}

export function TextAreaField({
  label,
  error,
  helpText,
  hideLabel = false,
  wrapperClassName = 'mb-3',
  id,
  className,
  required,
  rows = 3,
  ...textareaProps
}: TextAreaFieldProps) {
  const ids = useFieldIds(id, Boolean(helpText), Boolean(error));
  return (
    <div className={wrapperClassName}>
      <label htmlFor={ids.inputId} className={clsx('form-label', hideLabel && 'visually-hidden')}>
        {label}
        {required && <RequiredMark />}
      </label>
      <textarea
        id={ids.inputId}
        rows={rows}
        className={clsx('form-control', error && 'is-invalid', className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        aria-required={required || undefined}
        {...textareaProps}
      />
      <FieldMessages error={error} errorId={ids.errorId} helpText={helpText} helpId={ids.helpId} />
    </div>
  );
}

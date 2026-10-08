import type { ComponentPropsWithRef, ReactNode } from 'react';

import clsx from '@/utils/clsx';

import { FieldMessages, RequiredMark } from './FieldMessages';
import { useFieldIds } from './useFieldIds';

export interface FileFieldProps extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'size'> {
  label: string;
  error?: string;
  helpText?: ReactNode;
  size?: 'sm' | 'lg';
  wrapperClassName?: string;
}

/** Native file input styled by Bootstrap. Validate type/size on the client AND the server. */
export function FileField({
  label,
  error,
  helpText,
  size,
  wrapperClassName = 'mb-3',
  id,
  className,
  required,
  ...inputProps
}: FileFieldProps) {
  const ids = useFieldIds(id, Boolean(helpText), Boolean(error));
  return (
    <div className={wrapperClassName}>
      <label htmlFor={ids.inputId} className="form-label">
        {label}
        {required && <RequiredMark />}
      </label>
      <input
        id={ids.inputId}
        type="file"
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

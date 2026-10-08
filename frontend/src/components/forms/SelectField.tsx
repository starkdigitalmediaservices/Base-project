import type { ComponentPropsWithRef, ReactNode } from 'react';

import clsx from '@/utils/clsx';

import { FieldMessages, RequiredMark } from './FieldMessages';
import { useFieldIds } from './useFieldIds';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps extends Omit<ComponentPropsWithRef<'select'>, 'size'> {
  label: string;
  options: readonly SelectOption[];
  /** Renders an empty first option, e.g. "Select a role". */
  placeholder?: string;
  error?: string;
  helpText?: ReactNode;
  hideLabel?: boolean;
  size?: 'sm' | 'lg';
  wrapperClassName?: string;
}

export function SelectField({
  label,
  options,
  placeholder,
  error,
  helpText,
  hideLabel = false,
  size,
  wrapperClassName = 'mb-3',
  id,
  className,
  required,
  ...selectProps
}: SelectFieldProps) {
  const ids = useFieldIds(id, Boolean(helpText), Boolean(error));
  return (
    <div className={wrapperClassName}>
      <label htmlFor={ids.inputId} className={clsx('form-label', hideLabel && 'visually-hidden')}>
        {label}
        {required && <RequiredMark />}
      </label>
      <select
        id={ids.inputId}
        className={clsx(
          'form-select',
          size && `form-select-${size}`,
          error && 'is-invalid',
          className,
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        aria-required={required || undefined}
        {...selectProps}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldMessages error={error} errorId={ids.errorId} helpText={helpText} helpId={ids.helpId} />
    </div>
  );
}

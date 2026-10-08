import { type ComponentPropsWithRef, type ReactNode, useId } from 'react';

import clsx from '@/utils/clsx';

import { FieldMessages, RequiredMark } from './FieldMessages';
import type { SelectOption } from './SelectField';

export interface RadioGroupFieldProps extends Omit<
  ComponentPropsWithRef<'input'>,
  'type' | 'value' | 'defaultValue' | 'defaultChecked'
> {
  legend: string;
  name: string;
  options: readonly SelectOption[];
  error?: string;
  helpText?: ReactNode;
  inline?: boolean;
  wrapperClassName?: string;
  /** Initially selected option for uncontrolled use (react-hook-form uses its defaultValues). */
  defaultValue?: string;
}

/** Radio buttons grouped in a fieldset/legend. Spread react-hook-form's register() result. */
export function RadioGroupField({
  legend,
  name,
  options,
  error,
  helpText,
  inline = false,
  wrapperClassName = 'mb-3',
  required,
  disabled,
  defaultValue,
  ...inputProps
}: RadioGroupFieldProps) {
  const baseId = useId();
  const helpId = `${baseId}-help`;
  const errorId = `${baseId}-error`;
  const describedBy = [error ? errorId : null, helpText ? helpId : null].filter(Boolean).join(' ');

  return (
    <fieldset
      className={wrapperClassName}
      aria-describedby={describedBy || undefined}
      aria-invalid={error ? true : undefined}
      disabled={disabled}
    >
      <legend className="form-label fs-6">
        {legend}
        {required && <RequiredMark />}
      </legend>
      {options.map((option) => {
        const optionId = `${baseId}-${option.value}`;
        return (
          <div key={option.value} className={clsx('form-check', inline && 'form-check-inline')}>
            <input
              id={optionId}
              type="radio"
              name={name}
              value={option.value}
              disabled={option.disabled}
              defaultChecked={
                defaultValue === undefined ? undefined : defaultValue === option.value
              }
              className={clsx('form-check-input', error && 'is-invalid')}
              {...inputProps}
            />
            <label htmlFor={optionId} className="form-check-label">
              {option.label}
            </label>
          </div>
        );
      })}
      <FieldMessages error={error} errorId={errorId} helpText={helpText} helpId={helpId} />
    </fieldset>
  );
}

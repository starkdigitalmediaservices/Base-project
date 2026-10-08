import type { ComponentPropsWithRef, ReactNode } from 'react';

import clsx from '@/utils/clsx';

import { FieldMessages } from './FieldMessages';
import { useFieldIds } from './useFieldIds';

export interface CheckboxFieldProps extends Omit<ComponentPropsWithRef<'input'>, 'type'> {
  label: ReactNode;
  error?: string;
  helpText?: ReactNode;
  /** Render as a Bootstrap switch (role="switch"). */
  switch?: boolean;
  inline?: boolean;
  wrapperClassName?: string;
}

/** Checkbox or switch with label, help and error text. */
export function CheckboxField({
  label,
  error,
  helpText,
  switch: isSwitch = false,
  inline = false,
  wrapperClassName = 'mb-3',
  id,
  className,
  ...inputProps
}: CheckboxFieldProps) {
  const ids = useFieldIds(id, Boolean(helpText), Boolean(error));
  return (
    <div
      className={clsx(
        'form-check',
        isSwitch && 'form-switch',
        inline && 'form-check-inline',
        wrapperClassName,
      )}
    >
      <input
        id={ids.inputId}
        type="checkbox"
        role={isSwitch ? 'switch' : undefined}
        className={clsx('form-check-input', error && 'is-invalid', className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        {...inputProps}
      />
      <label htmlFor={ids.inputId} className="form-check-label">
        {label}
      </label>
      <FieldMessages error={error} errorId={ids.errorId} helpText={helpText} helpId={ids.helpId} />
    </div>
  );
}

export function SwitchField(props: Omit<CheckboxFieldProps, 'switch'>) {
  return <CheckboxField {...props} switch />;
}

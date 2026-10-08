import { useId } from 'react';

/** Stable ids that connect a control to its label, help text and error message. */
export function useFieldIds(id: string | undefined, hasHelp: boolean, hasError: boolean) {
  const generated = useId();
  const inputId = id ?? `field-${generated}`;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;
  const describedBy = [hasError ? errorId : null, hasHelp ? helpId : null]
    .filter(Boolean)
    .join(' ');
  return { inputId, helpId, errorId, describedBy: describedBy || undefined };
}

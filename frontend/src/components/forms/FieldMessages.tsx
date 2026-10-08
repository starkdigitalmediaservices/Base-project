import type { ReactNode } from 'react';

interface FieldMessagesProps {
  error?: string;
  errorId: string;
  helpText?: ReactNode;
  helpId: string;
}

/** Error and help text rendered under a form control. */
export function FieldMessages({ error, errorId, helpText, helpId }: FieldMessagesProps) {
  return (
    <>
      {error && (
        <div id={errorId} className="invalid-feedback d-block">
          {error}
        </div>
      )}
      {helpText && (
        <div id={helpId} className="form-text">
          {helpText}
        </div>
      )}
    </>
  );
}

export function RequiredMark() {
  return (
    <span className="text-danger ms-1" aria-hidden="true">
      *
    </span>
  );
}

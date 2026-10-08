import { TextField, type TextFieldProps } from './TextField';

export type DateFieldProps = Omit<TextFieldProps, 'type'> & {
  /** "date" (default), "datetime-local" or "time". */
  type?: 'date' | 'datetime-local' | 'time';
};

/** Native date/time picker — accessible, mobile-friendly and dependency-free. */
export function DateField({ type = 'date', ...props }: DateFieldProps) {
  return <TextField type={type} {...props} />;
}

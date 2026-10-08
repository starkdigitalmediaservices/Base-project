type ClassValue = string | false | null | undefined;

/** Joins truthy class names. Tiny local helper instead of an extra dependency. */
export default function clsx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}

import { useState } from 'react';

import { SearchInput } from '@/components/forms/SearchInput';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

interface DebouncedTextFilterProps {
  /** Committed value from table state. */
  value: string;
  onCommit: (value: string) => void;
  label: string;
  placeholder?: string;
  delayMs?: number;
  className?: string;
}

/** Search box that only commits (and therefore requests the API) after the user pauses typing. */
export function DebouncedTextFilter({
  value,
  onCommit,
  label,
  placeholder,
  delayMs = 300,
  className,
}: DebouncedTextFilterProps) {
  const [draft, setDraft] = useState(value);
  const [lastCommitted, setLastCommitted] = useState(value);

  // The committed value changed from outside (e.g. "Reset filters"): sync the draft.
  if (value !== lastCommitted) {
    setLastCommitted(value);
    if (value !== draft.trim()) {
      setDraft(value);
    }
  }

  const commit = useDebouncedCallback((next: string) => onCommit(next.trim()), delayMs);

  return (
    <SearchInput
      value={draft}
      label={label}
      placeholder={placeholder}
      size="sm"
      className={className}
      onChange={(next) => {
        setDraft(next);
        commit(next);
      }}
    />
  );
}

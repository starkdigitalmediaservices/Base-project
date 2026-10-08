import { type ChangeEvent, useId } from 'react';

import { Icon } from '@/components/ui/Icon';
import clsx from '@/utils/clsx';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'lg';
  disabled?: boolean;
}

/** Search box with a visually hidden label and a clear button. */
export function SearchInput({
  value,
  onChange,
  label = 'Search',
  placeholder = 'Search…',
  className,
  size,
  disabled,
}: SearchInputProps) {
  const id = useId();
  return (
    <div className={clsx('input-group', size && `input-group-${size}`, className)} role="search">
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <span className="input-group-text">
        <Icon name="search" />
      </span>
      <input
        id={id}
        type="search"
        className="form-control"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      />
      {value && !disabled && (
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => onChange('')}
          aria-label={`Clear ${label.toLowerCase()}`}
        >
          <Icon name="x-lg" />
        </button>
      )}
    </div>
  );
}

import { useId } from 'react';

import { PAGE_SIZE_OPTIONS } from '@/utils/pagination';

interface PageSizeSelectProps {
  value: number;
  onChange: (pageSize: number) => void;
  options?: readonly number[];
  disabled?: boolean;
}

export function PageSizeSelect({
  value,
  onChange,
  options = PAGE_SIZE_OPTIONS,
  disabled = false,
}: PageSizeSelectProps) {
  const id = useId();
  return (
    <div className="d-flex align-items-center gap-2">
      <label htmlFor={id} className="small text-body-secondary text-nowrap mb-0">
        Rows per page
      </label>
      <select
        id={id}
        className="form-select form-select-sm w-auto"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

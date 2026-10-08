import Dropdown from 'react-bootstrap/Dropdown';

import { Icon } from '@/components/ui/Icon';
import clsx from '@/utils/clsx';

import styles from './DataTable.module.css';
import type { RowAction } from './types';

interface RowActionsMenuProps<T> {
  row: T;
  actions: RowAction<T>[];
  rowLabel: string;
}

export function RowActionsMenu<T>({ row, actions, rowLabel }: RowActionsMenuProps<T>) {
  const visible = actions.filter((action) => !action.hidden);
  if (visible.length === 0) return null;

  return (
    <Dropdown align="end">
      <Dropdown.Toggle
        variant="link"
        size="sm"
        className={styles.actionsToggle}
        aria-label={`Actions for ${rowLabel}`}
      >
        <Icon name="three-dots-vertical" />
      </Dropdown.Toggle>
      <Dropdown.Menu popperConfig={{ strategy: 'fixed' }} renderOnMount={false}>
        {visible.map((action) => (
          <Dropdown.Item
            key={action.id}
            as="button"
            disabled={action.disabled}
            className={clsx(action.variant === 'danger' && 'text-danger')}
            onClick={() => action.onClick(row)}
          >
            {action.icon && <Icon name={action.icon} className="me-2" />}
            {action.label}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}

import Dropdown from 'react-bootstrap/Dropdown';

import { Icon, type IconName } from '@/components/ui/Icon';

import type { ThemePreference } from './themeStorage';
import { useTheme } from './useTheme';

const OPTIONS: { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon-stars' },
  { value: 'system', label: 'System', icon: 'circle-half' },
];

/** Dropdown to choose light, dark or system colour mode. */
export function ThemeSwitcher() {
  const { preference, resolvedTheme, setPreference } = useTheme();
  const currentIcon: IconName = resolvedTheme === 'dark' ? 'moon-stars' : 'sun';

  return (
    <Dropdown align="end">
      <Dropdown.Toggle
        variant="link"
        className="nav-link px-2"
        id="theme-switcher"
        aria-label={`Colour theme: ${preference}`}
      >
        <Icon name={currentIcon} />
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {OPTIONS.map((option) => (
          <Dropdown.Item
            key={option.value}
            as="button"
            active={preference === option.value}
            aria-pressed={preference === option.value}
            onClick={() => setPreference(option.value)}
          >
            <Icon name={option.icon} className="me-2" />
            {option.label}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}

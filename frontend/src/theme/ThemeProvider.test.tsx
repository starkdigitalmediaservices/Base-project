import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { ThemeProvider } from './ThemeProvider';
import { THEME_STORAGE_KEY } from './themeStorage';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useTheme } from './useTheme';

function ThemeProbe() {
  const { preference, resolvedTheme, toggleTheme } = useTheme();
  return (
    <div>
      <p>
        preference:{preference} resolved:{resolvedTheme}
      </p>
      <button type="button" onClick={toggleTheme}>
        Toggle
      </button>
    </div>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-bs-theme');
});

describe('ThemeProvider', () => {
  it('defaults to the system theme (light in jsdom)', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByText('preference:system resolved:light')).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('data-bs-theme', 'light');
  });

  it('toggles the theme, updates <html data-bs-theme> and persists the choice', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Toggle' }));

    expect(document.documentElement).toHaveAttribute('data-bs-theme', 'dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('restores a saved preference', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByText('preference:dark resolved:dark')).toBeInTheDocument();
  });

  it('lets the user pick a theme from the switcher', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: /Colour theme/ }));
    await user.click(screen.getByRole('button', { name: 'Dark' }));

    expect(document.documentElement).toHaveAttribute('data-bs-theme', 'dark');
  });
});

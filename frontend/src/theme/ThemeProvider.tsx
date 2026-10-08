import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { ThemeContext, type ThemeContextValue } from './themeContext';
import {
  applyTheme,
  getSystemTheme,
  readThemePreference,
  type ResolvedTheme,
  type ThemePreference,
  writeThemePreference,
} from './themeStorage';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readThemePreference);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  const resolvedTheme: ResolvedTheme = preference === 'system' ? systemTheme : preference;

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  // Follow OS changes while the user preference is "system".
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    writeThemePreference(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolvedTheme, setPreference, toggleTheme }),
    [preference, resolvedTheme, setPreference, toggleTheme],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

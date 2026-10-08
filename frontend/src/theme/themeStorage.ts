export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

/** Keep in sync with public/theme-init.js, which applies the theme before React loads. */
export const THEME_STORAGE_KEY = 'app.theme';

const PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'];

export function readThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return PREFERENCES.includes(stored as ThemePreference) ? (stored as ThemePreference) : 'system';
  } catch {
    return 'system';
  }
}

export function writeThemePreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage may be unavailable (private mode); the theme still applies for this session.
  }
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: ResolvedTheme): void {
  document.documentElement.setAttribute('data-bs-theme', theme);
}

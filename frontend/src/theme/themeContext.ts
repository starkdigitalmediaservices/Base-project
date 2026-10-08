import { createContext } from 'react';

import type { ResolvedTheme, ThemePreference } from './themeStorage';

export interface ThemeContextValue {
  /** What the user picked (may be "system"). */
  preference: ThemePreference;
  /** The theme actually applied to the document. */
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

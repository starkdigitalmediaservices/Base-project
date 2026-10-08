import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { SidebarContext, type SidebarContextValue } from './sidebarContext';

const STORAGE_KEY = 'app.sidebarCollapsed';

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/** UI state for the application sidebar (kept local to the layout, not global app state). */
export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(readCollapsed);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignore unavailable storage; the preference simply won't persist.
      }
      return next;
    });
  }, []);

  const openMobile = useCallback(() => setIsMobileOpen(true), []);
  const closeMobile = useCallback(() => setIsMobileOpen(false), []);

  const value = useMemo<SidebarContextValue>(
    () => ({ isCollapsed, toggleCollapsed, isMobileOpen, openMobile, closeMobile }),
    [isCollapsed, toggleCollapsed, isMobileOpen, openMobile, closeMobile],
  );

  return <SidebarContext value={value}>{children}</SidebarContext>;
}

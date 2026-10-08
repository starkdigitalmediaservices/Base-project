import { createContext } from 'react';

export interface SidebarContextValue {
  /** Desktop (≥ lg): icon-only rail when true. */
  isCollapsed: boolean;
  toggleCollapsed: () => void;
  /** Mobile/tablet (< lg): off-canvas drawer visibility. */
  isMobileOpen: boolean;
  openMobile: () => void;
  closeMobile: () => void;
}

export const SidebarContext = createContext<SidebarContextValue | null>(null);

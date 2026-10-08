import { useContext } from 'react';

import { SidebarContext, type SidebarContextValue } from './sidebarContext';

export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used inside <SidebarProvider>.');
  }
  return context;
}

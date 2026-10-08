import type { IconName } from '@/components/ui/Icon';
import { type Permission, PERMISSIONS } from '@/features/auth/permissions';
import { ROUTES } from '@/routes/paths';

export interface NavItem {
  label: string;
  to: string;
  icon: IconName;
  /** Hidden unless the current user has this permission. */
  permission?: Permission;
}

export interface NavSection {
  id: string;
  title?: string;
  items: NavItem[];
}

/** Sidebar navigation. Add an item here and a matching route in routes/router.tsx. */
export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'main',
    items: [
      { label: 'Dashboard', to: ROUTES.dashboard, icon: 'house' },
      { label: 'Components', to: ROUTES.components, icon: 'palette' },
    ],
  },
  {
    id: 'admin',
    title: 'Administration',
    items: [
      { label: 'Users', to: ROUTES.users, icon: 'people', permission: PERMISSIONS.USERS_READ },
      { label: 'Roles', to: ROUTES.roles, icon: 'shield-lock', permission: PERMISSIONS.ROLES_READ },
    ],
  },
  {
    id: 'account',
    title: 'Account',
    items: [{ label: 'Profile', to: ROUTES.account, icon: 'person-circle' }],
  },
];

/** Sections filtered by permission; empty sections are dropped. */
export function getVisibleNavSections(
  hasPermission: (permission?: Permission) => boolean,
): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => hasPermission(item.permission)),
  })).filter((section) => section.items.length > 0);
}

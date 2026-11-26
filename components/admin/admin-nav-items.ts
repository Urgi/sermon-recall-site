import {
  Bell,
  BookOpen,
  CreditCard,
  LayoutDashboard,
  Settings,
  Upload,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';

import type { UiKey, UiVars } from '@/lib/i18n/ui';

/** What the signed-in staff member may see; computed on the server from existing permission helpers. */
export type AdminNavPermissions = {
  canViewTeam: boolean;
  canViewNotifications: boolean;
  canPublish: boolean;
};

export type AdminNavCounts = {
  memberCount?: number | null;
  teamCount?: number | null;
};

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (path: string) => boolean;
  count?: number | null;
};

export type AdminNavGroup = {
  /** Small all-caps section label; omitted for the top "home" group. */
  label?: string;
  items: AdminNavItem[];
};

type T = (key: UiKey, vars?: UiVars) => string;

const startsWith = (prefix: string) => (p: string) => p === prefix || p.startsWith(`${prefix}/`);

export function buildAdminNav(t: T, perms: AdminNavPermissions, counts: AdminNavCounts = {}): AdminNavGroup[] {
  const content: AdminNavItem[] = [
    {
      href: '/sermons',
      label: t('nav.sermons'),
      icon: BookOpen,
      match: (p) => p.startsWith('/sermons') && !p.startsWith('/sermons/new'),
    },
  ];
  if (perms.canPublish) {
    content.push({
      href: '/sermons/new',
      label: t('sermons.upload'),
      icon: Upload,
      match: (p) => p.startsWith('/sermons/new'),
    });
  }

  const engagement: AdminNavItem[] = [];
  if (perms.canViewNotifications) {
    engagement.push({
      href: '/notifications',
      label: t('nav.notifications'),
      icon: Bell,
      match: startsWith('/notifications'),
    });
  }
  engagement.push({
    href: '/members',
    label: t('nav.members'),
    icon: Users,
    match: startsWith('/members'),
    count: counts.memberCount,
  });

  const church: AdminNavItem[] = [];
  if (perms.canViewTeam) {
    church.push({
      href: '/team',
      label: t('nav.team'),
      icon: UserCog,
      match: startsWith('/team'),
      count: counts.teamCount,
    });
    // Billing is owner/admin-pastor only — same audience as team management; the page re-checks can_manage_billing.
    church.push({ href: '/billing', label: t('nav.billing'), icon: CreditCard, match: startsWith('/billing') });
  }
  church.push({ href: '/settings', label: t('nav.settings'), icon: Settings, match: startsWith('/settings') });

  return [
    {
      items: [
        { href: '/dashboard', label: t('nav.overview'), icon: LayoutDashboard, match: (p) => p === '/dashboard' },
      ],
    },
    { label: t('nav.groupContent'), items: content },
    { label: t('nav.groupEngagement'), items: engagement },
    { label: t('nav.groupChurch'), items: church },
  ];
}

/** Title for the top bar, from the most specific nav match. */
export function currentNavLabel(groups: AdminNavGroup[], path: string): string | null {
  for (const g of groups) {
    for (const item of g.items) {
      if (item.match(path)) return item.label;
    }
  }
  return null;
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useAdminNav } from '@/components/admin/AdminNavContext';

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  match?: (path: string) => boolean;
};

function isActive(path: string, item: NavItem): boolean {
  if (item.match) return item.match(path);
  return path === item.href || path.startsWith(`${item.href}/`);
}

function IconOverview() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function IconSermons() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function IconMembers() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconTeam() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path d="M5 19a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconNotify() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6ZM9.5 18a2.5 2.5 0 0 0 5 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 3v2M12 19v2M5 12H3M21 12h-2M6.2 6.2l1.4 1.4M16.4 16.4l1.4 1.4M17.8 6.2l-1.4 1.4M7.6 16.4 6.2 17.8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AdminSidebarNav({
  canViewTeam,
  canViewNotifications,
  variant = 'sidebar',
}: {
  canViewTeam: boolean;
  canViewNotifications: boolean;
  variant?: 'sidebar' | 'compact';
}) {
  const router = useRouter();
  const { displayPath, beginNavigation } = useAdminNav();
  const items: NavItem[] = [
    { href: '/dashboard', label: 'Overview', icon: <IconOverview />, match: (p) => p === '/dashboard' },
    { href: '/sermons', label: 'Sermons', icon: <IconSermons />, match: (p) => p.startsWith('/sermons') },
    { href: '/members', label: 'Members', icon: <IconMembers />, match: (p) => p.startsWith('/members') },
  ];
  if (canViewTeam) items.push({ href: '/team', label: 'Team', icon: <IconTeam /> });
  if (canViewNotifications) {
    items.push({ href: '/notifications', label: 'Notifications', icon: <IconNotify /> });
  }
  items.push({ href: '/settings', label: 'Settings', icon: <IconSettings /> });

  useEffect(() => {
    const hrefs = items.map((item) => item.href);
    const run = () => {
      for (const href of hrefs) router.prefetch(href);
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run);
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(run, 200);
    return () => window.clearTimeout(timer);
    // Nav set is stable for a given permission pair.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewTeam, canViewNotifications, router]);

  if (variant === 'compact') {
    return (
      <nav className="flex min-w-0 flex-wrap items-center gap-2">
        {items.map((item) => {
          const active = isActive(displayPath, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onClick={() => beginNavigation(item.href)}
              className={`text-xs font-medium ${
                active ? 'text-admin-fg-strong' : 'text-admin-link hover:underline'
              }`}
            >
              {item.label === 'Notifications' ? 'Notify' : item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-1 text-[14px]">
      {items.map((item) => {
        const active = isActive(displayPath, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            onClick={() => beginNavigation(item.href)}
            className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 font-medium transition-colors ${
              active
                ? 'bg-[color-mix(in_srgb,var(--admin-accent)_14%,transparent)] text-[var(--admin-fg-strong)]'
                : 'text-[var(--admin-muted)] hover:bg-[var(--admin-nav-hover-bg)] hover:text-[var(--admin-accent)]'
            }`}
          >
            {active ? (
              <span
                aria-hidden
                className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-[#0ea5e9]"
              />
            ) : null}
            <span className={active ? 'text-[#0ea5e9]' : ''}>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

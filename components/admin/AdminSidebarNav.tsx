'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { useAdminNav } from '@/components/admin/AdminNavContext';
import { useLanguage } from '@/components/i18n/LanguageProvider';

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  match?: (path: string) => boolean;
  count?: number | null;
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
  memberCount = null,
  teamCount = null,
  variant = 'sidebar',
}: {
  canViewTeam: boolean;
  canViewNotifications: boolean;
  memberCount?: number | null;
  teamCount?: number | null;
  variant?: 'sidebar' | 'compact';
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const { displayPath, beginNavigation } = useAdminNav();
  const items: NavItem[] = [
    { href: '/dashboard', label: t('nav.overview'), icon: <IconOverview />, match: (p) => p === '/dashboard' },
    { href: '/sermons', label: t('nav.sermons'), icon: <IconSermons />, match: (p) => p.startsWith('/sermons') },
    {
      href: '/members',
      label: t('nav.members'),
      icon: <IconMembers />,
      match: (p) => p.startsWith('/members'),
      count: memberCount,
    },
  ];
  if (canViewTeam) {
    items.push({
      href: '/team',
      label: t('nav.team'),
      icon: <IconTeam />,
      match: (p) => p.startsWith('/team'),
      count: teamCount,
    });
    // Billing is owner/admin-pastor only — same audience as team management; the page re-checks can_manage_billing.
    items.push({
      href: '/billing',
      label: t('nav.billing'),
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3 10h18" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      ),
    });
  }
  if (canViewNotifications) {
    items.push({ href: '/notifications', label: t('nav.notifications'), icon: <IconNotify /> });
  }
  items.push({ href: '/settings', label: t('nav.settings'), icon: <IconSettings /> });

  useEffect(() => {
    const hrefs = items.map((item) => item.href);
    const run = () => {
      for (const href of hrefs) router.prefetch(href);
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run);
      return () => window.cancelIdleCallback(id);
    }
    const timer = globalThis.setTimeout(run, 200);
    return () => globalThis.clearTimeout(timer);
    // Nav set is stable for a given permission pair.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewTeam, canViewNotifications, router]);

  if (variant === 'compact') {
    return (
      <CompactNavScroller activeKey={displayPath}>
        {items.map((item) => {
          const active = isActive(displayPath, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onClick={() => beginNavigation(item.href)}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex min-h-10 shrink-0 items-center rounded-full border px-3.5 text-[13px] font-medium transition-colors duration-fast ${
                active
                  ? 'border-[color-mix(in_srgb,var(--admin-accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--admin-accent)_14%,transparent)] text-[var(--admin-fg-strong)]'
                  : 'border-admin text-[var(--admin-muted)] hover:bg-[var(--admin-nav-hover-bg)] hover:text-[var(--admin-accent)]'
              }`}
            >
              {item.href === '/notifications' ? t('nav.notifyShort') : item.label}
              {typeof item.count === 'number' ? (
                <span className="ml-1.5 tabular-nums opacity-80">{item.count}</span>
              ) : null}
            </Link>
          );
        })}
      </CompactNavScroller>
    );
  }

  return (
    <nav aria-label="Main" className="flex flex-col gap-1 text-[14px]">
      {items.map((item) => {
        const active = isActive(displayPath, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            onClick={() => beginNavigation(item.href)}
            aria-current={active ? 'page' : undefined}
            className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 font-medium transition-colors duration-fast ${
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
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {typeof item.count === 'number' ? (
              <span className="tabular-nums text-[12px] text-[var(--admin-muted)]">{item.count}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Horizontal tab row for phones: fades the edge that has more tabs behind it and keeps the
 * current tab scrolled into view, so Billing / Notifications / Settings are discoverable.
 */
function CompactNavScroller({ activeKey, children }: { activeKey: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>('[aria-current="page"]');
    if (active) {
      const target = active.offsetLeft - (el.clientWidth - active.offsetWidth) / 2;
      el.scrollTo({ left: Math.max(0, target) });
    }
    measure();
  }, [activeKey, measure]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const mask =
    edges.left && edges.right
      ? 'linear-gradient(to right, transparent, #000 2rem, #000 calc(100% - 2.5rem), transparent)'
      : edges.right
        ? 'linear-gradient(to right, #000 calc(100% - 2.5rem), transparent)'
        : edges.left
          ? 'linear-gradient(to right, transparent, #000 2rem)'
          : undefined;

  return (
    <nav
      ref={ref}
      aria-label="Main"
      onScroll={measure}
      style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
      className="-mx-4 flex min-w-0 items-center gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {children}
    </nav>
  );
}

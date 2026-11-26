'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';

import {
  buildAdminNav,
  type AdminNavCounts,
  type AdminNavPermissions,
} from '@/components/admin/admin-nav-items';
import { useAdminNav } from '@/components/admin/AdminNavContext';
import { useLanguage } from '@/components/i18n/LanguageProvider';

type Props = AdminNavPermissions &
  AdminNavCounts & {
    /** Called after a link is chosen (closes the mobile drawer). */
    onNavigate?: () => void;
  };

export function AdminSidebarNav({
  canViewTeam,
  canViewNotifications,
  canPublish,
  memberCount = null,
  teamCount = null,
  onNavigate,
}: Props) {
  const router = useRouter();
  const { t } = useLanguage();
  const { displayPath, beginNavigation } = useAdminNav();
  const groups = useMemo(
    () => buildAdminNav(t, { canViewTeam, canViewNotifications, canPublish }, { memberCount, teamCount }),
    [t, canViewTeam, canViewNotifications, canPublish, memberCount, teamCount],
  );

  useEffect(() => {
    const hrefs = groups.flatMap((g) => g.items.map((item) => item.href));
    const run = () => {
      for (const href of hrefs) router.prefetch(href);
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run);
      return () => window.cancelIdleCallback(id);
    }
    const timer = globalThis.setTimeout(run, 200);
    return () => globalThis.clearTimeout(timer);
  }, [groups, router]);

  return (
    <nav aria-label={t('nav.main')} className="flex flex-col gap-5">
      {groups.map((group, gi) =>
        group.items.length ? (
          <div key={group.label ?? `group-${gi}`} className="flex flex-col gap-1">
            {group.label ? (
              <p className="admin-nav-section mb-1" id={`nav-group-${gi}`}>
                {group.label}
              </p>
            ) : null}
            <ul className="flex flex-col gap-0.5" aria-labelledby={group.label ? `nav-group-${gi}` : undefined}>
              {group.items.map((item) => {
                const active = item.match(displayPath);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      prefetch
                      onClick={() => {
                        beginNavigation(item.href);
                        onNavigate?.();
                      }}
                      aria-current={active ? 'page' : undefined}
                      className="admin-nav-link"
                    >
                      <Icon aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {typeof item.count === 'number' ? (
                        <span className="rounded-full bg-[var(--admin-nav-hover-bg)] px-1.5 text-[11px] font-semibold tabular-nums text-[var(--admin-muted)]">
                          {item.count}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null,
      )}
    </nav>
  );
}

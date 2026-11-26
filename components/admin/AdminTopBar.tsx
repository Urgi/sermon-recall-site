'use client';

import { Bell, Menu, Moon, Search, Sun, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import {
  buildAdminNav,
  currentNavLabel,
  type AdminNavCounts,
  type AdminNavPermissions,
} from '@/components/admin/admin-nav-items';
import { useAdminNav } from '@/components/admin/AdminNavContext';
import { AdminSidebarNav } from '@/components/admin/AdminSidebarNav';
import { useAdminTheme } from '@/components/admin/ThemeProvider';
import { CommandPalette } from '@/components/admin/ui/CommandPalette';
import { useLanguage } from '@/components/i18n/LanguageProvider';

type Props = AdminNavPermissions &
  AdminNavCounts & {
    /** Logo link (server-rendered) shown in the bar on phones and atop the drawer. */
    brand: ReactNode;
    /** Account block (name, church, sign out) for the bottom of the phone drawer. */
    account: ReactNode;
  };

export function AdminTopBar({ brand, account, ...perms }: Props) {
  const { t } = useLanguage();
  const { displayPath } = useAdminNav();
  const { resolved, setPreference } = useAdminTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);

  const title = useMemo(
    () =>
      currentNavLabel(
        buildAdminNav(t, {
          canViewTeam: perms.canViewTeam,
          canViewNotifications: perms.canViewNotifications,
          canPublish: perms.canPublish,
        }),
        displayPath,
      ),
    [t, perms.canViewTeam, perms.canViewNotifications, perms.canPublish, displayPath],
  );

  return (
    <>
      <header className="admin-topbar sticky top-0 z-40">
        <div className="flex h-14 items-center gap-2 px-[clamp(1rem,3vw,2rem)] wide:h-16">
          <button
            type="button"
            className="admin-icon-btn wide:hidden"
            aria-label={t('nav.openMenu')}
            aria-expanded={drawerOpen}
            aria-controls="admin-drawer"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu aria-hidden className="h-[18px] w-[18px]" />
          </button>
          <div className="wide:hidden">{brand}</div>
          <p className="ml-1 hidden min-w-0 truncate text-[15px] font-semibold text-[var(--admin-fg-strong)] wide:block">
            {title}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="admin-search-pill"
              aria-label={t('cmd.search')}
              aria-haspopup="dialog"
              aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}
            >
              <Search aria-hidden className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('cmd.search')}</span>
              <kbd className="admin-kbd hidden sm:inline-flex">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
            </button>
            <button
              type="button"
              className="admin-icon-btn"
              onClick={() => setPreference(resolved === 'dark' ? 'light' : 'dark')}
              aria-label={resolved === 'dark' ? t('cmd.themeLight') : t('cmd.themeDark')}
            >
              {resolved === 'dark' ? (
                <Sun aria-hidden className="h-4 w-4" />
              ) : (
                <Moon aria-hidden className="h-4 w-4" />
              )}
            </button>
            {perms.canViewNotifications ? (
              <Link href="/notifications" className="admin-icon-btn" aria-label={t('nav.notifications')}>
                <Bell aria-hidden className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} brand={brand} account={account}>
        <AdminSidebarNav {...perms} onNavigate={() => setDrawerOpen(false)} />
      </MobileDrawer>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        canViewTeam={perms.canViewTeam}
        canViewNotifications={perms.canViewNotifications}
        canPublish={perms.canPublish}
      />
    </>
  );
}

function MobileDrawer({
  open,
  onClose,
  brand,
  account,
  children,
}: {
  open: boolean;
  onClose: () => void;
  brand: ReactNode;
  account: ReactNode;
  children: ReactNode;
}) {
  const { t } = useLanguage();
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] wide:hidden">
      <div className="admin-cmd-overlay absolute inset-0" aria-hidden onClick={onClose} />
      <div
        id="admin-drawer"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.main')}
        className="admin-drawer admin-fade-in absolute inset-y-0 left-0 flex w-[min(18rem,86vw)] flex-col overflow-y-auto p-4"
      >
        <div className="mb-6 flex items-center justify-between">
          {brand}
          <button ref={closeRef} type="button" className="admin-icon-btn" aria-label={t('nav.closeMenu')} onClick={onClose}>
            <X aria-hidden className="h-[18px] w-[18px]" />
          </button>
        </div>
        <div className="pl-3">{children}</div>
        <div className="mt-auto pt-6">{account}</div>
      </div>
    </div>
  );
}

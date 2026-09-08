'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

type AdminNavContextValue = {
  pathname: string;
  pendingHref: string | null;
  displayPath: string;
  beginNavigation: (href: string) => void;
};

const AdminNavContext = createContext<AdminNavContextValue | null>(null);

export function AdminNavProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/dashboard';
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    if (!pendingHref) return;
    const timer = window.setTimeout(() => setPendingHref(null), 12_000);
    return () => window.clearTimeout(timer);
  }, [pendingHref]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest('a');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === pathname && url.search === window.location.search) return;
      setPendingHref(url.pathname + url.search);
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [pathname]);

  useEffect(() => {
    document.body.style.cursor = pendingHref ? 'progress' : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [pendingHref]);

  const beginNavigation = useCallback(
    (href: string) => {
      const path = href.split('?')[0] ?? href;
      if (path === pathname || pathname.startsWith(`${path}/`)) return;
      setPendingHref(href);
    },
    [pathname],
  );

  const value = useMemo(
    () => ({
      pathname,
      pendingHref,
      displayPath: pendingHref ?? pathname,
      beginNavigation,
    }),
    [beginNavigation, pathname, pendingHref],
  );

  return (
    <AdminNavContext.Provider value={value}>
      <AdminNavProgress active={Boolean(pendingHref)} />
      {children}
    </AdminNavContext.Provider>
  );
}

export function useAdminNav() {
  const ctx = useContext(AdminNavContext);
  if (!ctx) {
    throw new Error('useAdminNav must be used within AdminNavProvider');
  }
  return ctx;
}

function AdminNavProgress({ active }: { active: boolean }) {
  const [visible, setVisible] = useState(false);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (active) {
      setFinishing(false);
      setVisible(true);
      return;
    }
    if (!visible) return;
    setFinishing(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      setFinishing(false);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [active, visible]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5 overflow-hidden"
      role="progressbar"
      aria-hidden
    >
      <div
        className={`h-full bg-[#0ea5e9] ${
          finishing ? 'w-full transition-all duration-200 ease-out' : 'w-2/3 animate-admin-progress'
        }`}
      />
    </div>
  );
}

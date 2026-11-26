'use client';

import { Bell, Building2, CornerDownLeft, Moon, Search, Sun, Upload, type LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  buildAdminNav,
  type AdminNavPermissions,
} from '@/components/admin/admin-nav-items';
import { useAdminNav } from '@/components/admin/AdminNavContext';
import { useAdminTheme } from '@/components/admin/ThemeProvider';
import { useLanguage } from '@/components/i18n/LanguageProvider';

type Command = {
  id: string;
  group: 'actions' | 'pages';
  label: string;
  icon: LucideIcon;
  keywords?: string;
  run: () => void;
};

type Props = AdminNavPermissions & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Frosted ⌘K / Ctrl+K palette. Lists only actions that already exist, filtered by permission. */
export function CommandPalette({ open, onOpenChange, canViewTeam, canViewNotifications, canPublish }: Props) {
  const router = useRouter();
  const { t } = useLanguage();
  const { resolved, setPreference } = useAdminTheme();
  const { beginNavigation } = useAdminNav();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const uid = useId();

  useEffect(() => setMounted(true), []);

  // Global shortcut.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const go = useCallback(
    (href: string) => {
      close();
      beginNavigation(href.split('#')[0] ?? href);
      router.push(href);
    },
    [beginNavigation, close, router],
  );

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [];
    if (canViewNotifications) {
      list.push({
        id: 'new-broadcast',
        group: 'actions',
        label: t('cmd.newBroadcast'),
        icon: Bell,
        keywords: 'notify push message send',
        run: () => go('/notifications#notify-church'),
      });
    }
    if (canPublish) {
      list.push({
        id: 'upload-sermon',
        group: 'actions',
        label: t('sermons.upload'),
        icon: Upload,
        keywords: 'add new sermon youtube transcript',
        run: () => go('/sermons/new'),
      });
    }
    list.push({
      id: 'church-settings',
      group: 'actions',
      label: t('cmd.churchSettings'),
      icon: Building2,
      keywords: 'church code timezone language',
      run: () => go('/settings'),
    });
    list.push({
      id: 'toggle-theme',
      group: 'actions',
      label: resolved === 'dark' ? t('cmd.themeLight') : t('cmd.themeDark'),
      icon: resolved === 'dark' ? Sun : Moon,
      keywords: 'appearance dark light mode',
      run: () => {
        setPreference(resolved === 'dark' ? 'light' : 'dark');
        close();
      },
    });
    for (const group of buildAdminNav(t, { canViewTeam, canViewNotifications, canPublish })) {
      for (const item of group.items) {
        if (item.href === '/sermons/new') continue; // already a quick action
        list.push({
          id: `page-${item.href}`,
          group: 'pages',
          label: item.label,
          icon: item.icon,
          keywords: group.label,
          run: () => go(item.href),
        });
      }
    }
    return list;
  }, [canPublish, canViewNotifications, canViewTeam, close, go, resolved, setPreference, t]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.keywords ?? ''}`.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => setActive(0), [query, open]);

  // Focus management: remember the opener, focus the input, restore on close, lock scroll.
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    setQuery('');
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(id);
      document.body.style.overflow = prevOverflow;
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (filtered.length ? (i + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filtered[active]?.run();
    } else if (e.key === 'Tab') {
      // Only the input is focusable inside the dialog; keep focus there.
      e.preventDefault();
    }
  }

  if (!open || !mounted) return null;

  const listboxId = `${uid}-list`;
  const optionId = (i: number) => `${uid}-opt-${i}`;
  let index = -1;

  const sections: { key: Command['group']; label: string }[] = [
    { key: 'actions', label: t('cmd.groupActions') },
    { key: 'pages', label: t('cmd.groupPages') },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[12vh]" onKeyDown={onKeyDown}>
      <div className="admin-cmd-overlay absolute inset-0" aria-hidden onClick={close} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('cmd.title')}
        className="admin-cmd-dialog admin-fade-in relative w-full max-w-lg overflow-hidden"
      >
        <div className="flex items-center gap-3 border-b border-admin px-4">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-[var(--admin-muted)]" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-activedescendant={filtered.length ? optionId(active) : undefined}
            aria-autocomplete="list"
            aria-label={t('cmd.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('cmd.placeholder')}
            className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-[var(--admin-fg-strong)] outline-none placeholder:text-[var(--admin-dim)]"
          />
          <kbd className="admin-kbd">esc</kbd>
        </div>
        <ul ref={listRef} id={listboxId} role="listbox" className="max-h-[min(60vh,24rem)] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <li className="px-3 py-8 text-center text-[14px] text-[var(--admin-muted)]" role="presentation">
              {t('cmd.empty')}
            </li>
          ) : (
            sections.map((section) => {
              const items = filtered.filter((c) => c.group === section.key);
              if (!items.length) return null;
              return (
                <li key={section.key} role="presentation" className="pb-1">
                  <p className="admin-nav-section px-3 pb-1 pt-2" aria-hidden>
                    {section.label}
                  </p>
                  <ul role="group" aria-label={section.label}>
                    {items.map((c) => {
                      index += 1;
                      const i = index;
                      const Icon = c.icon;
                      return (
                        <li
                          key={c.id}
                          id={optionId(i)}
                          data-index={i}
                          role="option"
                          aria-selected={i === active}
                          onMouseMove={() => setActive(i)}
                          onClick={() => c.run()}
                          className="admin-cmd-item flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-3 text-[14px] text-[var(--admin-fg-secondary)]"
                        >
                          <Icon aria-hidden className="h-4 w-4 shrink-0 text-[var(--admin-dim)]" strokeWidth={1.75} />
                          <span className="min-w-0 flex-1 truncate">{c.label}</span>
                          {i === active ? (
                            <CornerDownLeft aria-hidden className="h-3.5 w-3.5 text-[var(--admin-muted)]" />
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })
          )}
        </ul>
        <div className="flex items-center gap-4 border-t border-admin px-4 py-2.5 text-[12px] text-[var(--admin-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <kbd className="admin-kbd">↑</kbd>
            <kbd className="admin-kbd">↓</kbd>
            {t('cmd.hintNavigate')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className="admin-kbd">↵</kbd>
            {t('cmd.hintOpen')}
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5">
            <kbd className="admin-kbd">esc</kbd>
            {t('cmd.hintClose')}
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

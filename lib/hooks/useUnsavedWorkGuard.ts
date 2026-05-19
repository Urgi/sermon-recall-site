'use client';

import { useEffect } from 'react';

import { confirmLeaveUnsavedWork } from '@/lib/unsaved-work';

type Options = {
  /** When true, warn on tab close / in-app navigation. */
  active: boolean;
  /** Confirm dialog copy. */
  message: string;
  /**
   * When true, `beforeunload` still fires but in-app link clicks are not intercepted
   * (e.g. allow emergency navigation). Prefer keeping false during long operations.
   */
  allowInAppNavigation?: boolean;
};

function isInternalNavHref(href: string): boolean {
  if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
  if (href.startsWith('http://') || href.startsWith('https://')) {
    try {
      const url = new URL(href);
      return url.origin === window.location.origin;
    } catch {
      return false;
    }
  }
  return href.startsWith('/');
}

/**
 * Warns before the user leaves with unsaved sermon / devotional work.
 * Covers refresh/close (`beforeunload`) and same-origin `<a>` clicks (App Router links).
 */
export function useUnsavedWorkGuard({
  active,
  message,
  allowInAppNavigation = false,
}: Options): void {
  useEffect(() => {
    if (!active) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [active]);

  useEffect(() => {
    if (!active || allowInAppNavigation) return;

    window.history.pushState({ __unsavedWorkGuard: true }, '', window.location.href);

    const onPopState = () => {
      if (!confirmLeaveUnsavedWork(message)) {
        window.history.pushState({ __unsavedWorkGuard: true }, '', window.location.href);
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [active, allowInAppNavigation, message]);

  useEffect(() => {
    if (!active || allowInAppNavigation) return;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest('a[href]');
      if (!anchor) return;
      if (anchor.getAttribute('target') === '_blank') return;
      const href = anchor.getAttribute('href');
      if (!href || !isInternalNavHref(href)) return;
      if (!confirmLeaveUnsavedWork(message)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [active, allowInAppNavigation, message]);
}

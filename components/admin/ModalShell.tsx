'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

const EXIT_MS = 120;

const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

type ModalShellProps = {
  open: boolean;
  onClose: () => void;
  /** id of the element that titles the dialog. */
  labelledBy: string;
  /** Block backdrop click and Escape (e.g. while a request is running). */
  locked?: boolean;
  panelClassName?: string;
  children: ReactNode;
};

/**
 * Shared dialog chrome: backdrop + panel with the same enter/exit motion, Escape to close,
 * focus moved inside and restored on close, and page scroll locked while open.
 * Stays mounted for the exit animation, so render it always and drive it with `open`.
 */
export function ModalShell({
  open,
  onClose,
  labelledBy,
  locked = false,
  panelClassName = '',
  children,
}: ModalShellProps) {
  const [mounted, setMounted] = useState(open);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const lockedRef = useRef(locked);
  lockedRef.current = locked;

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const id = window.setTimeout(() => setMounted(false), reduce ? 0 : EXIT_MS);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open || !mounted) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus({ preventScroll: true });

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !lockedRef.current) {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = items[0]!;
      const lastEl = items[items.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && (active === firstEl || !panelRef.current.contains(active))) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && (active === lastEl || !panelRef.current.contains(active))) {
        e.preventDefault();
        firstEl.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      returnFocusRef.current?.focus?.({ preventScroll: true });
    };
    // Only re-run when the dialog actually opens/closes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mounted]);

  if (!mounted) return null;

  const state = open ? 'open' : 'closed';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        data-state={state}
        className="admin-modal-backdrop absolute inset-0 bg-black/60"
        aria-hidden
        onClick={() => {
          if (!locked) onClose();
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        data-state={state}
        className={`admin-modal-panel relative max-h-[90vh] w-full overflow-y-auto text-left outline-none ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
}

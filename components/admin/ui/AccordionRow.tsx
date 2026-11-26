'use client';

import { ChevronDown, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';

type Props = {
  title: ReactNode;
  /** One-line summary shown while collapsed, e.g. "5 most recent". */
  summary?: ReactNode;
  icon?: LucideIcon;
  defaultOpen?: boolean;
  /** Extra control on the right of the header (rendered outside the toggle button). */
  action?: ReactNode;
  id?: string;
  children: ReactNode;
};

/**
 * Collapsible row for lower-priority lists. Content stays mounted (so it can load its own
 * data and report counts) but is `hidden` while collapsed.
 */
export function AccordionRow({ title, summary, icon: Icon, defaultOpen = false, action, id, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const uid = useId();
  const panelId = `${uid}-panel`;
  const buttonId = `${uid}-button`;

  // Deep links like /members#invite open the matching row.
  useEffect(() => {
    if (!id) return;
    const sync = () => {
      if (window.location.hash === `#${id}`) setOpen(true);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [id]);

  return (
    <div id={id} className="glass-panel scroll-mt-24 overflow-hidden">
      <div className="flex items-center">
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="admin-accordion-trigger flex min-h-[3.5rem] min-w-0 flex-1 items-center gap-3 px-5 py-3 text-left"
        >
          {Icon ? (
            <span className="glass-inner flex h-8 w-8 shrink-0 items-center justify-center">
              <Icon aria-hidden className="h-4 w-4 text-[var(--admin-accent)]" strokeWidth={1.75} />
            </span>
          ) : null}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold text-[var(--admin-fg-strong)]">{title}</span>
            {summary ? (
              <span className="block truncate text-[13px] text-[var(--admin-muted)]">{summary}</span>
            ) : null}
          </span>
          <ChevronDown aria-hidden className="admin-accordion-chevron h-4 w-4 shrink-0 text-[var(--admin-muted)]" />
        </button>
        {action ? <div className="shrink-0 pr-4">{action}</div> : null}
      </div>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!open}
        className={open ? 'admin-fade-in border-t border-admin' : undefined}
      >
        {children}
      </div>
    </div>
  );
}

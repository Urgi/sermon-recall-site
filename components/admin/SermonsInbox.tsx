'use client';

import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { enUS, es, fr } from 'date-fns/locale';
import { useMemo, useState } from 'react';

import { DeleteSermonButton } from '@/components/admin/DeleteSermonButton';
import type { AppLanguage } from '@/lib/i18n/languages';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import type { UiKey } from '@/lib/i18n/ui';
import type { SermonsFilterId } from '@/lib/admin/sermons-filter';
import type { PastorLifecycle } from '@/lib/admin/workflow-status';

export type SermonsInboxRow = {
  id: string;
  title: string;
  sermon_date: string | null;
  pastor_name: string | null;
  scripture: string | null;
  series: string | null;
  lifecycle: PastorLifecycle;
};

const FILTERS: { id: SermonsFilterId; label: UiKey }[] = [
  { id: 'all', label: 'sermons.filterAll' },
  { id: 'review_needed', label: 'sermons.filterReview' },
  { id: 'processing', label: 'sermons.filterProcessing' },
  { id: 'failed', label: 'sermons.filterFailed' },
  { id: 'published', label: 'sermons.filterPublished' },
];

function countFor(rows: SermonsInboxRow[], id: SermonsFilterId): number {
  if (id === 'all') return rows.length;
  return rows.filter((r) => r.lifecycle === id).length;
}

function defaultFilter(rows: SermonsInboxRow[]): SermonsFilterId {
  if (countFor(rows, 'review_needed') > 0) return 'review_needed';
  if (countFor(rows, 'processing') > 0) return 'processing';
  if (countFor(rows, 'failed') > 0) return 'failed';
  return 'all';
}

const DATE_LOCALES = { en: enUS, es, fr } as const;

function formatSermonDate(ymd: string | null, language: AppLanguage): string {
  if (!ymd) return '—';
  try {
    return format(parseISO(ymd), 'PP', { locale: DATE_LOCALES[language] });
  } catch {
    return ymd;
  }
}

function subtitleFor(row: SermonsInboxRow): string | null {
  const parts = [row.scripture, row.series, !row.series ? row.pastor_name : null].filter(
    (p): p is string => Boolean(p?.trim()),
  );
  if (parts.length === 0) return null;
  return parts.slice(0, 2).join(' · ');
}

function matchesQuery(row: SermonsInboxRow, q: string): boolean {
  if (!q) return true;
  const hay = [row.title, row.pastor_name, row.scripture, row.series, subtitleFor(row)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

function filterChipClass(id: SermonsFilterId, selected: boolean): string {
  const base =
    'min-h-9 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-fast';
  if (!selected) {
    return `${base} border-[var(--admin-border-strong)] text-[var(--admin-muted)] hover:text-[var(--admin-fg-strong)]`;
  }
  switch (id) {
    case 'review_needed':
      return `${base} border-orange-400/70 bg-orange-500/10 text-orange-700 dark:text-orange-300`;
    case 'processing':
      return `${base} border-sky-400/70 bg-sky-500/10 text-sky-700 dark:text-sky-300`;
    case 'failed':
      return `${base} border-red-400/70 bg-red-500/10 text-red-700 dark:text-red-300`;
    case 'published':
      return `${base} border-emerald-400/70 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`;
    default:
      return `${base} border-[var(--admin-fg-strong)] bg-[var(--admin-fg-strong)] text-[var(--admin-card-bg)]`;
  }
}

function statusPresentation(life: PastorLifecycle): {
  label: UiKey;
  wrap: string;
  icon: 'dot' | 'spin';
} {
  switch (life) {
    case 'review_needed':
      return {
        label: 'sermons.statusReview',
        wrap: 'border-orange-400/60 text-orange-700 dark:text-orange-300',
        icon: 'dot',
      };
    case 'processing':
      return {
        label: 'sermons.statusProcessing',
        wrap: 'border-sky-400/60 text-sky-700 dark:text-sky-300',
        icon: 'spin',
      };
    case 'published':
      return {
        label: 'sermons.statusPublished',
        wrap: 'border-emerald-400/60 text-emerald-700 dark:text-emerald-300',
        icon: 'dot',
      };
    case 'failed':
      return {
        label: 'sermons.statusFailed',
        wrap: 'border-red-400/60 text-red-700 dark:text-red-300',
        icon: 'dot',
      };
    case 'ready_to_publish':
      return {
        label: 'sermons.statusReady',
        wrap: 'border-emerald-400/60 text-emerald-700 dark:text-emerald-300',
        icon: 'dot',
      };
    case 'archived':
      return {
        label: 'sermons.statusArchived',
        wrap: 'border-slate-500/50 text-slate-400',
        icon: 'dot',
      };
    default:
      return {
        label: 'sermons.statusDraft',
        wrap: 'border-slate-500/50 text-slate-400',
        icon: 'dot',
      };
  }
}

function actionFor(life: PastorLifecycle): { label: UiKey; hrefSuffix?: string } {
  switch (life) {
    case 'review_needed':
      return { label: 'sermons.actReview' };
    case 'processing':
      return { label: 'sermons.actProgress' };
    case 'failed':
      return { label: 'sermons.actRetry' };
    case 'ready_to_publish':
      return { label: 'sermons.actPublish' };
    case 'draft':
      return { label: 'sermons.actContinue' };
    default:
      return { label: 'sermons.actView' };
  }
}

export function SermonsInbox({
  rows,
  initialFilter,
  canDelete = false,
}: {
  rows: SermonsInboxRow[];
  initialFilter?: SermonsFilterId | null;
  canDelete?: boolean;
}) {
  const { t, language } = useLanguage();
  const [filter, setFilter] = useState<SermonsFilterId>(() => initialFilter ?? defaultFilter(rows));
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const reviewCount = countFor(rows, 'review_needed');

  const shown = useMemo(() => {
    const byStatus = filter === 'all' ? rows : rows.filter((r) => r.lifecycle === filter);
    return byStatus.filter((r) => matchesQuery(r, q));
  }, [filter, q, rows]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block min-w-0 max-w-xs flex-1">
          <span className="sr-only">{t('sermons.search')}</span>
          <SearchIcon />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('sermons.search')}
            className="h-9 w-full rounded-full border border-[var(--admin-border)] bg-[var(--glass-inner-bg)] py-1.5 pl-9 pr-3 text-[13px] text-[var(--admin-fg-strong)] outline-none transition-[border-color,box-shadow] duration-fast placeholder:text-[var(--admin-muted)] focus:border-[var(--admin-accent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--admin-accent)_28%,transparent)]"
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('sermons.filterLabel')}>
          {FILTERS.map((f) => {
            const n = countFor(rows, f.id);
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={filterChipClass(f.id, filter === f.id)}
              >
                {t(f.label)}{' '}
                <span className="tabular-nums opacity-80">({n})</span>
              </button>
            );
          })}
        </div>
      </div>

      {reviewCount > 0 ? (
        <button
          type="button"
          onClick={() => setFilter('review_needed')}
          className="flex w-full items-start gap-3 rounded-xl border border-orange-400/40 bg-orange-500/[0.07] px-4 py-3.5 text-left transition-colors duration-fast hover:bg-orange-500/10"
        >
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-orange-600 dark:text-orange-400">
            <ReviewDocIcon />
          </span>
          <span>
            <span className="block text-[15px] font-semibold text-orange-700 dark:text-orange-300">
              {reviewCount === 1
                ? t('sermons.reviewBannerOne')
                : t('sermons.reviewBanner', { n: reviewCount })}
            </span>
            <span className="mt-0.5 block text-[13px] text-[var(--admin-muted)]">
              {t('sermons.reviewBannerHint')}
            </span>
          </span>
        </button>
      ) : null}

      {shown.length === 0 ? (
        <div className="admin-card p-10 text-center">
          <p className="admin-section-title">
            {rows.length === 0
              ? t('sermons.emptyNone')
              : q
                ? t('sermons.emptySearch')
                : t('sermons.emptyView')}
          </p>
          <p className="admin-hint mx-auto mt-1 max-w-sm">
            {rows.length === 0
              ? t('sermons.emptyNoneHint')
              : q
                ? t('sermons.emptySearchHint')
                : t('sermons.emptyViewHint')}
          </p>
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <table className="w-full text-left">
            <thead className="border-b border-admin text-[11px] font-semibold uppercase tracking-[0.08em] text-admin-dim">
              <tr>
                <th className="px-4 py-3 sm:px-5">{t('sermons.colSermon')}</th>
                <th className="hidden px-5 py-3 sm:table-cell">{t('sermons.colDate')}</th>
                <th className="px-4 py-3 sm:px-5">{t('sermons.colStatus')}</th>
                <th className="px-4 py-3 sm:px-5 text-right">{t('sermons.colAction')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin">
              {shown.map((s) => {
                const status = statusPresentation(s.lifecycle);
                const action = actionFor(s.lifecycle);
                const sub = subtitleFor(s);
                return (
                  <tr key={s.id} className="transition-colors duration-fast hover:bg-admin-nav-hover/40">
                    <td className="px-4 py-4 sm:px-5">
                      <Link
                        href={`/sermons/${s.id}`}
                        className="text-[15px] font-medium text-[var(--admin-link)] hover:underline"
                      >
                        {s.title}
                      </Link>
                      {sub ? <p className="mt-1 text-[13px] text-[var(--admin-muted)]">{sub}</p> : null}
                    </td>
                    <td className="hidden whitespace-nowrap px-5 py-4 text-[14px] text-[var(--admin-fg-strong)] sm:table-cell">
                      {formatSermonDate(s.sermon_date, language)}
                    </td>
                    <td className="px-4 py-4 sm:px-5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium ${status.wrap}`}
                      >
                        {status.icon === 'spin' ? <SpinIcon /> : <StatusDot />}
                        {t(status.label)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right sm:px-5">
                      <div className="flex flex-col items-end gap-1.5">
                        <Link
                          href={`/sermons/${s.id}`}
                          className="-mr-1 inline-flex min-h-7 items-center gap-1 rounded-md px-1 text-[13px] font-semibold text-[var(--admin-link)] hover:underline"
                        >
                          {t(action.label)}
                          <span aria-hidden>→</span>
                        </Link>
                        {canDelete ? (
                          <DeleteSermonButton
                            sermonId={s.id}
                            sermonTitle={s.title}
                            published={s.lifecycle === 'published'}
                            variant="inline"
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-muted)]"
      fill="none"
      aria-hidden
    >
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function ReviewDocIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path
        d="M8 3h6l5 5v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M9 14l2 2 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatusDot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />;
}

function SpinIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 animate-spin" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.75" />
      <path d="M13.5 8a5.5 5.5 0 0 0-5.5-5.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

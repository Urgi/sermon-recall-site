'use client';

import Link from 'next/link';
import { format, parseISO, startOfWeek } from 'date-fns';
import { enUS, es, fr } from 'date-fns/locale';
import { useMemo, useState } from 'react';

import { useLanguage } from '@/components/i18n/LanguageProvider';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { DashboardShareCard } from '@/components/admin/DashboardShareCard';
import { useAdminTheme } from '@/components/admin/ThemeProvider';
import type { AppLanguage } from '@/lib/i18n/languages';
import type { UiKey, UiVars } from '@/lib/i18n/ui';
import type { PastorLifecycle } from '@/lib/admin/workflow-status';
import type { PastorEngagementPayload, PastorMidweekNudgeStatus } from '@/lib/engagement/types';
import { getAdminChartTheme } from '@/lib/theme/chart-theme';

export type DashboardSermonRow = {
  id: string;
  title: string;
  sermon_date: string | null;
  lifecycle: PastorLifecycle;
};

type RangeId = '7' | '30' | '90';

/** Weekly buckets: 7-day toggle still shows a short trend so the line has shape. */
const RANGE_WEEKS: Record<RangeId, number> = { '7': 5, '30': 5, '90': 8 };

type Props = {
  greetingName: string | null;
  churchName: string;
  churchCode: string | null;
  joinUrl: string | null;
  qrDataUrl: string | null;
  canPublish: boolean;
  canNotify: boolean;
  engagement: PastorEngagementPayload | null;
  midweekNudge: PastorMidweekNudgeStatus | null;
  recentSermons: DashboardSermonRow[];
};

function greeting(t: (key: 'dash.goodMorning' | 'dash.goodAfternoon' | 'dash.goodEvening') => string): string {
  const h = new Date().getHours();
  if (h < 12) return t('dash.goodMorning');
  if (h < 17) return t('dash.goodAfternoon');
  return t('dash.goodEvening');
}

const DATE_LOCALES = { en: enUS, es, fr } as const;

function weekLabel(ymd: string, language: AppLanguage): string {
  try {
    return format(parseISO(ymd), 'MMM d', { locale: DATE_LOCALES[language] });
  } catch {
    return ymd;
  }
}

function formatSermonDate(ymd: string | null, language: AppLanguage): string {
  if (!ymd) return '—';
  try {
    return format(parseISO(ymd), 'PP', { locale: DATE_LOCALES[language] });
  } catch {
    return ymd;
  }
}

function ratePct(count: number, members: number): number {
  if (members <= 0) return 0;
  return Math.round((100 * count) / members);
}

function sermonCompleted(sermonId: string, engagement: PastorEngagementPayload | null): number {
  const row = engagement?.sermons.find((s) => s.sermon_id === sermonId);
  if (!row?.days.length) return 0;
  return Math.max(...row.days.map((d) => d.completed_count), 0);
}

const COMMITMENT_PREVIEW = 4;

function displayCommitment(raw: string): string {
  return raw.trim().replace(/^[“"']+/, '').replace(/[”"']+$/, '').trim();
}

export function DashboardOverview({
  greetingName,
  churchName,
  churchCode,
  joinUrl,
  qrDataUrl,
  canPublish,
  canNotify,
  engagement,
  midweekNudge,
  recentSermons,
}: Props) {
  const { resolved } = useAdminTheme();
  const { t, language } = useLanguage();
  const chart = getAdminChartTheme(resolved);
  const [range, setRange] = useState<RangeId>('7');
  const [showAllCommitments, setShowAllCommitments] = useState(false);
  const hello = greetingName ? `${greeting(t)}, ${greetingName.split(' ')[0]}` : greeting(t);
  const members = engagement?.member_count ?? 0;
  const inactive = engagement?.inactive_this_week ?? 0;
  const opened = engagement?.opened_this_week ?? 0;
  const completed = engagement?.active_this_week ?? 0;
  const commitments = (engagement?.sample_commitments ?? [])
    .map(displayCommitment)
    .filter(Boolean);

  const weeklyPoints = useMemo(() => {
    const weekly =
      engagement?.weekly.length
        ? engagement.weekly
        : engagement
          ? [
              {
                week_start: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
                member_count: engagement.member_count,
                opened_count: engagement.opened_this_week,
                completed_count: engagement.active_this_week,
              },
            ]
          : [];
    return weekly.slice(-RANGE_WEEKS[range]).map((w) => ({
      label: weekLabel(w.week_start, language),
      opened: w.opened_count,
      completed: w.completed_count,
    }));
  }, [engagement, range, language]);

  const metrics = [
    {
      label: t('dash.metricMembers'),
      value: members,
      hint: t('dash.metricMembersHint'),
      icon: 'members' as const,
      href: '/members',
    },
    {
      label: t('dash.metricActive'),
      value: opened,
      hint: t('dash.metricActiveHint', { pct: ratePct(opened, members) }),
      icon: 'active' as const,
      pct: ratePct(opened, members),
    },
    {
      label: t('dash.metricCompleted'),
      value: completed,
      hint: t('dash.metricCompletedHint', { pct: ratePct(completed, members) }),
      icon: 'completed' as const,
      pct: ratePct(completed, members),
    },
    {
      label: t('dash.metricInactive'),
      value: inactive,
      hint: t('dash.metricInactiveHint', { pct: ratePct(inactive, members) }),
      icon: 'encourage' as const,
      pct: ratePct(inactive, members),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="admin-hero flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--admin-accent)]">
            {format(new Date(), 'EEEE, d MMMM', { locale: DATE_LOCALES[language] })}
            {churchName ? ` · ${churchName}` : ''}
          </p>
          <h1 className="mt-1.5 text-[2rem] font-bold tracking-tight text-[var(--admin-fg-strong)]">
            {hello}
          </h1>
          <p className="mt-1 text-[14px] text-[var(--admin-muted)]">
            {t('dash.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canNotify ? (
            <Link
              href="/notifications"
              aria-label={t('dash.notifications')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--admin-border-strong)] bg-[var(--admin-card-bg)]/60 text-[var(--admin-fg-strong)] backdrop-blur transition-colors duration-fast hover:border-[var(--admin-accent)] hover:text-[var(--admin-accent)]"
            >
              <BellIcon />
            </Link>
          ) : null}
          {canPublish ? (
            <Link href="/sermons/new" className="admin-btn-primary">
              {t('dash.addSermon')}
            </Link>
          ) : null}
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map((m) => {
          const body = (
            <>
              <MetricIcon kind={m.icon} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">{m.label}</p>
                <p className="mt-2 text-[1.875rem] font-bold leading-none sm:text-[2.25rem] tracking-tight tabular-nums text-[var(--admin-fg-strong)]">
                  {engagement ? m.value : '—'}
                </p>
                {m.pct !== undefined ? (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--admin-border)]">
                    <div
                      className={`h-full rounded-full ${m.icon === 'encourage' ? 'bg-rose-400' : m.icon === 'completed' ? 'bg-emerald-400' : 'bg-sky-400'}`}
                      style={{ width: `${Math.min(100, m.pct ?? 0)}%` }}
                    />
                  </div>
                ) : null}
                <p className="mt-2 text-[12px] text-[var(--admin-muted)]">{m.hint}</p>
              </div>
            </>
          );
          const className =
            'admin-stat-card flex flex-col gap-3 max-sm:p-4 sm:flex-row sm:items-start sm:gap-4';
          if ('href' in m && m.href) {
            return (
              <Link
                key={m.label}
                href={m.href}
                className={`${className} transition-colors duration-fast hover:border-[var(--admin-accent)]`}
              >
                {body}
              </Link>
            );
          }
          return (
            <div key={m.label} className={className}>
              {body}
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(16rem,1fr)]">
        <div className="admin-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--admin-fg-strong)]">
                {t('dash.weeklyEngagement')}
              </h2>
              <p className="mt-1 text-[13px] leading-snug text-[var(--admin-muted)]">
                {t('dash.weeklyEngagementHint')}
              </p>
            </div>
            <div className="inline-flex rounded-full border border-[var(--admin-border-strong)] p-0.5 text-[13px] font-semibold">
              {(['7', '30', '90'] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setRange(id)}
                  aria-pressed={range === id}
                  className={`min-h-8 rounded-full px-3 py-1 transition-colors duration-fast ${
                    range === id
                      ? 'bg-[#0379bd] text-white shadow-[0_4px_12px_-4px_rgba(14,165,233,0.7)]'
                      : 'text-[var(--admin-muted)] hover:text-[var(--admin-fg-strong)]'
                  }`}
                >
                  {t('dash.range', { n: id })}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 h-64 w-full min-h-[16rem]">
            {weeklyPoints.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyPoints} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gOpened" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chart.barOpened} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={chart.barOpened} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chart.barCompleted} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={chart.barCompleted} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={chart.gridStroke} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: chart.tickFill, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: chart.tickFill, fontSize: 12 }} width={28} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ stroke: chart.gridStroke }}
                    contentStyle={{
                      backgroundColor: chart.tooltip.backgroundColor,
                      border: chart.tooltip.border,
                      borderRadius: 12,
                      boxShadow: '0 12px 28px -12px rgba(0,0,0,0.5)',
                    }}
                    labelStyle={{ color: chart.tooltip.labelColor }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ color: chart.legendColor, fontSize: 12 }}
                    formatter={(value) => <span className="text-[12px] text-[var(--admin-muted)]">{value}</span>}
                  />
                  <Area
                    type="monotone"
                    dataKey="opened"
                    name={t('dash.chartOpened')}
                    stroke={chart.barOpened}
                    strokeWidth={2.5}
                    fill="url(#gOpened)"
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name={t('dash.chartCompleted')}
                    stroke={chart.barCompleted}
                    strokeWidth={2.5}
                    fill="url(#gCompleted)"
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="admin-hint pt-16 text-center">{t('dash.chartEmpty')}</p>
            )}
          </div>
        </div>

        <div className="admin-card flex flex-col p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300">
              <ChartMiniIcon />
            </span>
            <h2 className="text-lg font-semibold text-[var(--admin-fg-strong)]">{t('dash.thisWeek')}</h2>
          </div>
          {members > 0 ? (
            <>
              <div className="mt-5 flex items-center gap-5">
                <ProgressRing pct={ratePct(completed, members)} />
                <p className="text-[1.75rem] font-bold leading-none tracking-tight tabular-nums text-[var(--admin-fg-strong)]">
                  {t('dash.ofMembers', { done: completed, total: members })}
                </p>
              </div>
              <p className="mt-3 text-[15px] leading-snug text-[var(--admin-fg-secondary)]">
                {t('dash.completedDevotional')}
              </p>
              <p className="mt-2 text-[13px] text-[var(--admin-muted)]">
                {t('dash.completionRate', { pct: ratePct(completed, members) })}
              </p>
            </>
          ) : (
            <p className="mt-6 text-[15px] leading-snug text-[var(--admin-fg-secondary)]">
              {t('dash.inviteToSee')}
            </p>
          )}
          <Link
            href="/members"
            className="mt-auto pt-6 text-[14px] font-medium text-[var(--admin-link)] hover:underline"
          >
            {t('dash.viewMembers')}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(16rem,1fr)]">
        <div className="admin-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-lg font-semibold text-[var(--admin-fg-strong)]">{t('dash.recentSermons')}</h2>
            <Link
              href="/sermons?filter=all"
              className="-mr-2 inline-flex min-h-8 items-center rounded-md px-2 text-[14px] font-medium text-[var(--admin-link)] hover:underline"
            >
              {t('common.viewAll')}
            </Link>
          </div>
          {recentSermons.length === 0 ? (
            <p className="admin-hint px-5 pb-5">{t('dash.noSermons')}</p>
          ) : (
            <table className="w-full text-left text-[14px]">
              <thead className="border-y border-admin text-[11px] font-semibold uppercase tracking-wide text-admin-dim">
                <tr>
                  <th className="px-5 py-2.5">{t('dash.colTitle')}</th>
                  <th className="hidden px-5 py-2.5 sm:table-cell">{t('dash.colDate')}</th>
                  <th className="hidden px-5 py-2.5 md:table-cell">{t('dash.colMembers')}</th>
                  <th className="px-5 py-2.5">{t('dash.colProgress')}</th>
                  <th className="w-10 px-2 py-2.5">
                    <span className="sr-only">{t('dash.colActions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin">
                {recentSermons.map((s) => {
                  const done = sermonCompleted(s.id, engagement);
                  const pct = ratePct(done, members);
                  return (
                    <tr key={s.id} className="transition-colors duration-fast hover:bg-admin-nav-hover/60">
                      <td className="px-5 py-3">
                        <Link
                          href={`/sermons/${s.id}`}
                          className="font-medium text-[var(--admin-fg-strong)] hover:text-[var(--admin-link)]"
                        >
                          {s.title}
                        </Link>
                      </td>
                      <td className="admin-hint hidden px-5 py-3 sm:table-cell">
                        {formatSermonDate(s.sermon_date, language)}
                      </td>
                      <td className="hidden px-5 py-3 tabular-nums text-[13px] text-[var(--admin-fg-secondary)] md:table-cell">
                        {members || '—'}
                      </td>
                      <td className="px-5 py-3">
                        {members > 0 ? (
                          <div className="flex items-center gap-3">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--admin-border)] sm:w-28">
                              <div
                                className={`h-full rounded-full ${pct >= 50 ? 'bg-emerald-400' : 'bg-sky-400'}`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <span className="text-[12px] font-semibold tabular-nums text-[var(--admin-fg-secondary)]">
                              {done}/{members} · {pct}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-[13px] text-[var(--admin-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-2 py-3">
                        <Link
                          href={`/sermons/${s.id}`}
                          aria-label={t('dash.open', { title: s.title })}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--admin-muted)] hover:bg-admin-nav-hover hover:text-[var(--admin-fg-strong)]"
                        >
                          <KebabIcon />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {churchCode && joinUrl && qrDataUrl ? (
          <DashboardShareCard
            churchName={churchName}
            churchCode={churchCode}
            joinUrl={joinUrl}
            qrDataUrl={qrDataUrl}
            heading={t('dash.shareHeading')}
            hint={t('dash.shareHint')}
            size="lg"
            showEmail={false}
          />
        ) : (
          <div className="admin-card p-5">
            <h2 className="text-lg font-semibold text-[var(--admin-fg-strong)]">{t('dash.shareHeading')}</h2>
            <p className="admin-hint mt-2">{t('dash.shareEmpty')}</p>
            <Link href="/members#invite" className="mt-4 inline-block text-[13px] font-medium text-[var(--admin-link)]">
              {t('dash.inviteMembers')}
            </Link>
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(16rem,1fr)]">
        <div className="admin-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[var(--admin-fg-strong)]">
              {t('dash.applying')}
            </h2>
            {commitments.length > COMMITMENT_PREVIEW ? (
              <button
                type="button"
                onClick={() => setShowAllCommitments((v) => !v)}
                className="text-[14px] font-medium text-[var(--admin-link)] hover:underline"
              >
                {showAllCommitments ? t('common.showLess') : t('common.viewAll')}
              </button>
            ) : null}
          </div>
          <p className="admin-hint mt-1">{t('dash.applyingHint')}</p>
          {commitments.length ? (
            <ul className="mt-4 space-y-2">
              {(showAllCommitments ? commitments : commitments.slice(0, COMMITMENT_PREVIEW)).map(
                (c, i) => (
                  <li
                    key={`${i}-${c.slice(0, 24)}`}
                    className="flex items-start gap-3 rounded-xl border border-admin bg-[var(--admin-surface-bg)]/50 px-4 py-3.5"
                  >
                    <QuoteIcon />
                    <p className="text-[15px] leading-snug text-[var(--admin-fg-strong)]">
                      “{c.length > 140 ? `${c.slice(0, 137)}…` : c}”
                    </p>
                  </li>
                ),
              )}
            </ul>
          ) : (
            <p className="admin-hint mt-4">{t('dash.applyingEmpty')}</p>
          )}
        </div>

        <div className="admin-card flex flex-col p-5">
          <h2 className="text-lg font-semibold text-[var(--admin-fg-strong)]">
            {t('dash.nudge')}
          </h2>
          {midweekNudge && midweekNudge.phase !== 'none' ? (
            <>
              <p className="admin-body mt-3 flex-1 text-[14px]">{midweekNudgeCopy(midweekNudge, t)}</p>
              <p className="admin-hint mt-3 text-[12px]">{t('dash.nudgeHint')}</p>
            </>
          ) : canPublish ? (
            <>
              <p className="admin-body mt-3 flex-1 text-[14px]">
                {t('dash.nudgeAdd')}
              </p>
              <Link href="/sermons/new" className="admin-btn-primary mt-4 w-full text-center">
                {t('dash.addSermon')}
              </Link>
            </>
          ) : (
            <p className="admin-body mt-3 text-[14px]">
              {t('dash.nudgeAuto')}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function midweekNudgeCopy(
  nudge: PastorMidweekNudgeStatus,
  t: (key: UiKey, vars?: UiVars) => string,
): string {
  const sent = nudge.sent_count;
  const will = nudge.will_send_count;
  const pick = (n: number, zero: UiKey, one: UiKey, many: UiKey) =>
    n === 0 ? t(zero) : n === 1 ? t(one) : t(many, { n });
  if (nudge.phase === 'sent') return pick(sent, 'nudge.sentZero', 'nudge.sentOne', 'nudge.sentMany');
  if (nudge.phase === 'due') return pick(will, 'nudge.dueZero', 'nudge.dueOne', 'nudge.dueMany');
  if (nudge.phase === 'upcoming') {
    return pick(will, 'nudge.upcomingZero', 'nudge.upcomingOne', 'nudge.upcomingMany');
  }
  if (nudge.phase === 'missed') {
    return pick(sent, 'nudge.missedNone', 'nudge.missedOne', 'nudge.missedMany');
  }
  return t('dash.nudgeAuto');
}

function MetricIcon({ kind }: { kind: 'members' | 'active' | 'completed' | 'encourage' }) {
  const wrap =
    kind === 'encourage'
      ? 'bg-rose-500/15 text-rose-300'
      : kind === 'members'
        ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
  return (
    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-current/20 ${wrap}`}>
      {kind === 'members' ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
          <path
            d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      ) : kind === 'active' ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
          <path d="M4 20V10M10 20V4M16 20v-7M22 20V8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      ) : kind === 'completed' ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
          <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
          <path
            d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6M16 11h6"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      )}
    </span>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 72 72" className="h-[4.5rem] w-[4.5rem] shrink-0 -rotate-90" aria-hidden>
      <circle cx="36" cy="36" r={r} fill="none" stroke="var(--admin-border)" strokeWidth="7" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke="#38bdf8"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(100, pct) / 100)}
      />
    </svg>
  );
}

function BellIcon() {
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

function ChartMiniIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20V8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function KebabIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" fill="currentColor" aria-hidden>
      <path d="M7.2 11.2C7.2 8.4 8.9 6.3 11.8 5.2L11 7.4c-1.2.5-1.8 1.4-1.8 2.6.9 0 2.4.5 2.4 2.4 0 1.6-1.2 2.8-2.8 2.8S6 14.6 6 12.8c0-.6.1-1.2.5-1.6-.2-.4-.3-1-.3-1.6 0-2.2 1.5-4.4 5-4.4l-1 2.4C8.4 6.4 7.2 8 7.2 11.2Zm8.8 0c0-2.8 1.7-4.9 4.6-6L19.8 7.4c-1.2.5-1.8 1.4-1.8 2.6.9 0 2.4.5 2.4 2.4 0 1.6-1.2 2.8-2.8 2.8s-2.8-1.2-2.8-3c0-.6.1-1.2.5-1.6-.2-.4-.3-1-.3-1.6 0-2.2 1.5-4.4 5-4.4l-1 2.4c-1.8.6-3 2.2-3 5.4Z" />
    </svg>
  );
}

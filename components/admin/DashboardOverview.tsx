'use client';

import Link from 'next/link';
import { format, parseISO, startOfWeek } from 'date-fns';
import { enUS, es, fr } from 'date-fns/locale';
import { useMemo, useState } from 'react';

import { useLanguage } from '@/components/i18n/LanguageProvider';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  ArrowRight,
  Bell,
  BookOpen,
  CircleCheck,
  HeartHandshake,
  Megaphone,
  MessageSquareQuote,
  QrCode,
  Upload,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { DashboardShareCard } from '@/components/admin/DashboardShareCard';
import { AccordionRow } from '@/components/admin/ui/AccordionRow';
import { GlassPanel, PanelHeader } from '@/components/admin/ui/GlassPanel';
import { PrimaryCta } from '@/components/admin/ui/PrimaryCta';
import { StatCard, type StatTrend } from '@/components/admin/ui/StatCard';
import { pastorLifecycleBadgeClass } from '@/lib/admin/workflow-status';
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
    // Day-first in Spanish and French (e.g. "26 oct"), month-first in English.
    return format(parseISO(ymd), language === 'en' ? 'MMM d' : 'd MMM', {
      locale: DATE_LOCALES[language],
    });
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

  const latest = recentSermons[0] ?? null;

  const weeklyRows = engagement?.weekly ?? [];
  const lastWeek = weeklyRows.length >= 2 ? weeklyRows[weeklyRows.length - 1] : null;
  const prevWeek = weeklyRows.length >= 2 ? weeklyRows[weeklyRows.length - 2] : null;
  const trend = (delta: number | null, invert = false): StatTrend | null =>
    delta === null
      ? null
      : {
          delta,
          invert,
          label: t('dash.vsLastWeek'),
          ariaLabel: t('dash.trendAria', { delta: delta > 0 ? `+${delta}` : String(delta) }),
        };
  const diff = (pick: (w: NonNullable<typeof lastWeek>) => number) =>
    lastWeek && prevWeek ? pick(lastWeek) - pick(prevWeek) : null;

  const metrics: {
    label: string;
    value: number;
    hint: string;
    icon: LucideIcon;
    href?: string;
    trend: StatTrend | null;
  }[] = [
    {
      label: t('dash.metricMembers'),
      value: members,
      hint: t('dash.metricMembersHint'),
      icon: Users,
      href: '/members',
      trend: trend(diff((w) => w.member_count)),
    },
    {
      label: t('dash.metricActive'),
      value: opened,
      hint: t('dash.metricActiveHint', { pct: ratePct(opened, members) }),
      icon: Activity,
      trend: trend(diff((w) => w.opened_count)),
    },
    {
      label: t('dash.metricCompleted'),
      value: completed,
      hint: t('dash.metricCompletedHint', { pct: ratePct(completed, members) }),
      icon: CircleCheck,
      trend: trend(diff((w) => w.completed_count)),
    },
    {
      label: t('dash.metricInactive'),
      value: inactive,
      hint: t('dash.metricInactiveHint', { pct: ratePct(inactive, members) }),
      icon: HeartHandshake,
      trend: trend(diff((w) => w.member_count - w.completed_count), true),
    },
  ];

  const reachLabel =
    members > 0 ? (members === 1 ? t('dash.reachOne') : t('dash.reachMany', { n: members })) : null;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[13px] font-medium text-[var(--admin-muted)]">
          {format(new Date(), language === 'es' ? "EEEE, d 'de' MMMM" : 'EEEE, d MMMM', {
            locale: DATE_LOCALES[language],
          })}
          {churchName ? ` · ${churchName}` : ''}
        </p>
        <h1 className="mt-1 text-[1.75rem] font-semibold tracking-tight text-[var(--admin-fg-strong)]">{hello}</h1>
      </header>

      {/* 1 · What an admin does first: check the latest sermon, then reach the church. */}
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
        <LatestSermonPanel
          latest={latest}
          engagement={engagement}
          members={members}
          canPublish={canPublish}
          language={language}
          t={t}
        />
        <ActionPanel
          canNotify={canNotify}
          canPublish={canPublish}
          reachLabel={reachLabel}
          midweekNudge={midweekNudge}
          t={t}
        />
      </section>

      {/* 2 · KPIs */}
      <section aria-label={t('dash.thisWeek')} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map((m) => (
          <StatCard
            key={m.label}
            label={m.label}
            value={engagement ? m.value : '—'}
            hint={m.trend && m.trend.delta !== 0 ? undefined : m.hint}
            icon={m.icon}
            href={m.href}
            trend={engagement && m.trend && m.trend.delta !== 0 ? m.trend : null}
          />
        ))}
      </section>

      {/* 3 · Trend + this week */}
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
        <GlassPanel as="section" aria-labelledby="dash-weekly">
          <PanelHeader
            id="dash-weekly"
            title={t('dash.weeklyEngagement')}
            hint={t('dash.weeklyEngagementHint')}
            action={
              <div className="glass-inner inline-flex p-0.5 text-[12px] font-semibold" role="group">
                {(['7', '30', '90'] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setRange(id)}
                    aria-pressed={range === id}
                    className={`min-h-8 rounded-[10px] px-3 transition-colors duration-fast ${
                      range === id
                        ? 'bg-[color-mix(in_srgb,var(--admin-accent)_20%,transparent)] text-[var(--admin-fg-strong)]'
                        : 'text-[var(--admin-muted)] hover:text-[var(--admin-fg-strong)]'
                    }`}
                  >
                    {t('dash.range', { n: id })}
                  </button>
                ))}
              </div>
            }
          />
          <div className="mt-5 h-60 w-full min-h-[15rem]">
            {weeklyPoints.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyPoints} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={chart.gridStroke} strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: chart.tickFill, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: chart.tickFill, fontSize: 12 }} width={28} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ stroke: chart.gridStroke }}
                    contentStyle={{
                      backgroundColor: chart.tooltip.backgroundColor,
                      border: chart.tooltip.border,
                      borderRadius: 12,
                      boxShadow: 'none',
                    }}
                    labelStyle={{ color: chart.tooltip.labelColor }}
                  />
                  <Legend
                    iconType="plainline"
                    iconSize={14}
                    wrapperStyle={{ color: chart.legendColor, fontSize: 12 }}
                    formatter={(value) => <span className="text-[12px] text-[var(--admin-muted)]">{value}</span>}
                  />
                  <Line
                    type="monotone"
                    dataKey="opened"
                    name={t('dash.chartOpened')}
                    stroke={chart.barOpened}
                    strokeWidth={1.75}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    name={t('dash.chartCompleted')}
                    stroke={chart.barCompleted}
                    strokeWidth={1.75}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="admin-hint pt-16 text-center">{t('dash.chartEmpty')}</p>
            )}
          </div>
        </GlassPanel>

        <GlassPanel as="section" aria-labelledby="dash-this-week" className="flex flex-col">
          <PanelHeader id="dash-this-week" title={t('dash.thisWeek')} />
          {members > 0 ? (
            <>
              <div className="mt-5 flex items-center gap-5">
                <ProgressRing pct={ratePct(completed, members)} />
                <div>
                  <p className="text-[1.75rem] font-semibold leading-none tracking-tight tabular-nums text-[var(--admin-fg-strong)]">
                    {t('dash.ofMembers', { done: completed, total: members })}
                  </p>
                  <p className="mt-2 text-[13px] leading-snug text-[var(--admin-fg-secondary)]">
                    {t('dash.completedDevotional')}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[13px] text-[var(--admin-muted)]">
                {t('dash.completionRate', { pct: ratePct(completed, members) })}
              </p>
            </>
          ) : (
            <p className="mt-5 text-[14px] leading-snug text-[var(--admin-fg-secondary)]">{t('dash.inviteToSee')}</p>
          )}
          <div className="glass-inner mt-5 p-4">
            <p className="text-[12px] font-medium text-[var(--admin-muted)]">{t('dash.nudge')}</p>
            <p className="mt-1 text-[13px] leading-snug text-[var(--admin-fg-secondary)]">
              {midweekNudge && midweekNudge.phase !== 'none'
                ? midweekNudgeCopy(midweekNudge, t)
                : t('dash.nudgeAuto')}
            </p>
          </div>
          <Link
            href="/members"
            className="mt-auto inline-flex items-center gap-1 pt-5 text-[13px] font-medium text-[var(--admin-link)] hover:underline"
          >
            {t('dash.viewMembers')}
          </Link>
        </GlassPanel>
      </section>

      {/* 4 · Secondary lists, folded */}
      <section aria-label={t('dash.moreSection')} className="space-y-3">
        <p className="admin-nav-section px-1">{t('dash.moreSection')}</p>

        <AccordionRow
          title={t('dash.recentSermons')}
          icon={BookOpen}
          summary={
            recentSermons.length
              ? t('dash.summarySermons', { n: recentSermons.length })
              : t('dash.summaryNone')
          }
          action={
            <Link
              href="/sermons?filter=all"
              className="inline-flex min-h-8 items-center rounded-lg px-2 text-[13px] font-medium text-[var(--admin-link)] hover:underline"
            >
              {t('common.viewAll')}
            </Link>
          }
        >
          {recentSermons.length === 0 ? (
            <p className="admin-hint px-5 py-5">{t('dash.noSermons')}</p>
          ) : (
            <table className="w-full text-left text-[14px]">
              <thead className="border-b border-admin text-[11px] font-semibold uppercase tracking-wide text-admin-dim">
                <tr>
                  <th className="px-5 py-2.5">{t('dash.colTitle')}</th>
                  <th className="hidden px-5 py-2.5 sm:table-cell">{t('dash.colDate')}</th>
                  <th className="px-5 py-2.5">{t('dash.colProgress')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin">
                {recentSermons.map((s) => {
                  const done = sermonCompleted(s.id, engagement);
                  const pct = ratePct(done, members);
                  return (
                    <tr key={s.id} className="transition-colors duration-fast hover:bg-admin-nav-hover">
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
                      <td className="px-5 py-3">
                        {members > 0 ? (
                          <div className="flex items-center gap-3">
                            <div className="h-1 w-20 overflow-hidden rounded-full bg-[var(--admin-border)] sm:w-28">
                              <div
                                className="h-full rounded-full bg-[var(--admin-accent)]"
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <span className="text-[12px] font-medium tabular-nums text-[var(--admin-fg-secondary)]">
                              {done}/{members} · {pct}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-[13px] text-[var(--admin-muted)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </AccordionRow>

        <AccordionRow
          title={t('dash.applying')}
          icon={MessageSquareQuote}
          summary={
            commitments.length
              ? t('dash.summaryCommitments', { n: commitments.length })
              : t('dash.summaryNone')
          }
        >
          <div className="p-5">
            <p className="admin-hint">{t('dash.applyingHint')}</p>
            {commitments.length ? (
              <ul className="mt-4 space-y-2">
                {(showAllCommitments ? commitments : commitments.slice(0, COMMITMENT_PREVIEW)).map((c, i) => (
                  <li key={`${i}-${c.slice(0, 24)}`} className="glass-inner px-4 py-3">
                    <p className="text-[14px] leading-snug text-[var(--admin-fg-strong)]">
                      “{c.length > 140 ? `${c.slice(0, 137)}…` : c}”
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="admin-hint mt-4">{t('dash.applyingEmpty')}</p>
            )}
            {commitments.length > COMMITMENT_PREVIEW ? (
              <button
                type="button"
                onClick={() => setShowAllCommitments((v) => !v)}
                className="mt-3 text-[13px] font-medium text-[var(--admin-link)] hover:underline"
              >
                {showAllCommitments ? t('common.showLess') : t('common.viewAll')}
              </button>
            ) : null}
          </div>
        </AccordionRow>

        <AccordionRow
          id="share"
          title={t('dash.shareHeading')}
          icon={QrCode}
          summary={churchCode ? t('dash.summaryInvite', { code: churchCode }) : t('dash.shareEmpty')}
        >
          {churchCode && joinUrl && qrDataUrl ? (
            <DashboardShareCard
              churchName={churchName}
              churchCode={churchCode}
              joinUrl={joinUrl}
              qrDataUrl={qrDataUrl}
              headingKey="dash.shareHeading"
              hintKey="dash.shareHint"
              size="lg"
              showEmail={false}
              bare
            />
          ) : (
            <div className="p-5">
              <p className="admin-hint">{t('dash.shareEmpty')}</p>
              <Link href="/members#invite" className="mt-3 inline-block text-[13px] font-medium text-[var(--admin-link)]">
                {t('dash.inviteMembers')}
              </Link>
            </div>
          )}
        </AccordionRow>
      </section>
    </div>
  );
}

type TFn = (key: UiKey, vars?: UiVars) => string;

function LatestSermonPanel({
  latest,
  engagement,
  members,
  canPublish,
  language,
  t,
}: {
  latest: DashboardSermonRow | null;
  engagement: PastorEngagementPayload | null;
  members: number;
  canPublish: boolean;
  language: AppLanguage;
  t: TFn;
}) {
  if (!latest) {
    return (
      <GlassPanel as="section" aria-labelledby="dash-latest" className="admin-hero flex flex-col justify-between gap-5">
        <div>
          <p id="dash-latest" className="text-[12px] font-medium text-[var(--admin-muted)]">
            {t('dash.latestSermon')}
          </p>
          <p className="mt-2 max-w-md text-[15px] leading-snug text-[var(--admin-fg-secondary)]">{t('dash.latestEmpty')}</p>
        </div>
        {canPublish ? (
          <div>
            <PrimaryCta href="/sermons/new" label={t('sermons.upload')} outcome={t('dash.uploadOutcome')} icon={Upload} />
          </div>
        ) : null}
      </GlassPanel>
    );
  }

  const done = sermonCompleted(latest.id, engagement);
  const pct = ratePct(done, members);
  const days = [...(engagement?.sermons.find((s) => s.sermon_id === latest.id)?.days ?? [])].sort(
    (a, b) => a.day_number - b.day_number,
  );
  const dayMax = Math.max(members, ...days.map((d) => d.completed_count), 1);

  return (
    <section aria-labelledby="dash-latest" className="admin-hero flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-[var(--admin-muted)]">{t('dash.latestSermon')}</p>
          <h2 id="dash-latest" className="mt-1.5 text-[1.375rem] font-semibold leading-tight tracking-tight text-[var(--admin-fg-strong)]">
            <Link href={`/sermons/${latest.id}`} className="hover:text-[var(--admin-link)]">
              {latest.title}
            </Link>
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-[var(--admin-muted)]">
            <span>{formatSermonDate(latest.sermon_date, language)}</span>
            <span className={pastorLifecycleBadgeClass(latest.lifecycle)}>{t(`life.${latest.lifecycle}` as UiKey)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/sermons/${latest.id}`} className="admin-btn-secondary inline-flex min-h-10 items-center gap-1.5">
            {t('dash.openSermon')}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
          {canPublish ? (
            <Link href="/sermons/new" className="admin-btn-secondary inline-flex min-h-10 items-center gap-1.5">
              <Upload aria-hidden className="h-4 w-4" />
              {t('sermons.upload')}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end">
        <div>
          <p className="text-[2.5rem] font-semibold leading-none tracking-tight tabular-nums text-[var(--admin-fg-strong)]">
            {members > 0 ? `${pct}%` : '—'}
          </p>
          <p className="mt-2 max-w-[16rem] text-[13px] leading-snug text-[var(--admin-muted)]">
            {members > 0 ? `${t('dash.ofMembers', { done, total: members })} · ` : ''}
            {t('dash.recallLabel')}
          </p>
        </div>
        {days.length ? (
          <ol className="flex h-24 items-end gap-2 sm:justify-end" aria-label={t('dash.recallLabel')}>
            {days.map((d) => {
              const h = Math.max(4, Math.round((d.completed_count / dayMax) * 72));
              return (
                <li key={d.day_number} className="flex w-8 flex-col items-center gap-1.5">
                  <span className="sr-only">{t('dash.dayCompleted', { n: d.day_number, done: d.completed_count })}</span>
                  <span aria-hidden className="text-[11px] font-medium tabular-nums text-[var(--admin-fg-secondary)]">
                    {d.completed_count}
                  </span>
                  <span
                    aria-hidden
                    className="w-full rounded-md bg-gradient-to-t from-sky-600/50 to-sky-500/90 dark:from-sky-400/30 dark:to-sky-300/85"
                    style={{ height: `${h}px` }}
                  />
                  <span aria-hidden className="text-[11px] text-[var(--admin-muted)]">
                    {t('dash.dayShort', { n: d.day_number })}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : null}
      </div>
    </section>
  );
}

function ActionPanel({
  canNotify,
  canPublish,
  reachLabel,
  midweekNudge,
  t,
}: {
  canNotify: boolean;
  canPublish: boolean;
  reachLabel: string | null;
  midweekNudge: PastorMidweekNudgeStatus | null;
  t: TFn;
}) {
  if (canNotify) {
    return (
      <GlassPanel as="section" aria-labelledby="dash-broadcast" className="flex flex-col">
        <span className="glass-inner flex h-10 w-10 items-center justify-center">
          <Megaphone aria-hidden className="h-5 w-5 text-[var(--admin-accent)]" strokeWidth={1.75} />
        </span>
        <h2 id="dash-broadcast" className="mt-4 text-[17px] font-semibold text-[var(--admin-fg-strong)]">
          {t('dash.broadcastTitle')}
        </h2>
        <p className="mt-1.5 text-[13px] leading-snug text-[var(--admin-muted)]">{t('dash.broadcastBody')}</p>
        <div className="mt-auto pt-5">
          <PrimaryCta
            href="/notifications#notify-church"
            label={t('dash.sendBroadcast')}
            outcome={reachLabel}
            icon={Bell}
            motion="ring"
            className="w-full"
          />
        </div>
      </GlassPanel>
    );
  }
  if (canPublish) {
    return (
      <GlassPanel as="section" aria-labelledby="dash-next" className="flex flex-col">
        <h2 id="dash-next" className="text-[17px] font-semibold text-[var(--admin-fg-strong)]">
          {t('dash.nudge')}
        </h2>
        <p className="mt-1.5 text-[13px] leading-snug text-[var(--admin-muted)]">{t('dash.nudgeAdd')}</p>
        <div className="mt-auto pt-5">
          <PrimaryCta
            href="/sermons/new"
            label={t('sermons.upload')}
            outcome={t('dash.uploadOutcome')}
            icon={Upload}
            className="w-full"
          />
        </div>
      </GlassPanel>
    );
  }
  return (
    <GlassPanel as="section" aria-labelledby="dash-nudge">
      <h2 id="dash-nudge" className="text-[17px] font-semibold text-[var(--admin-fg-strong)]">
        {t('dash.nudge')}
      </h2>
      <p className="mt-2 text-[14px] leading-snug text-[var(--admin-fg-secondary)]">
        {midweekNudge && midweekNudge.phase !== 'none' ? midweekNudgeCopy(midweekNudge, t) : t('dash.nudgeAuto')}
      </p>
    </GlassPanel>
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

'use client';

import Link from 'next/link';
import { format, parseISO, startOfWeek } from 'date-fns';
import { useMemo, useState } from 'react';
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

import { DashboardShareCard } from '@/components/admin/DashboardShareCard';
import { useAdminTheme } from '@/components/admin/ThemeProvider';
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

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function weekLabel(ymd: string): string {
  try {
    return format(parseISO(ymd), 'MMM d');
  } catch {
    return ymd;
  }
}

function formatSermonDate(ymd: string | null): string {
  if (!ymd) return '—';
  try {
    return format(parseISO(ymd), 'MMM d, yyyy');
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
  const chart = getAdminChartTheme(resolved);
  const [range, setRange] = useState<RangeId>('7');
  const [showAllCommitments, setShowAllCommitments] = useState(false);
  const hello = greetingName ? `${greeting()}, ${greetingName.split(' ')[0]}` : greeting();
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
      label: weekLabel(w.week_start),
      opened: w.opened_count,
      completed: w.completed_count,
    }));
  }, [engagement, range]);

  const metrics = [
    {
      label: 'Total members',
      value: members,
      hint: 'Open the Members tab',
      icon: 'members' as const,
      href: '/members',
    },
    {
      label: 'Active this week',
      value: opened,
      hint: `${ratePct(opened, members)}% opened a devotional`,
      icon: 'active' as const,
    },
    {
      label: 'Completed',
      value: completed,
      hint: `${ratePct(completed, members)}% completed this week`,
      icon: 'completed' as const,
    },
    {
      label: 'Needs encouragement',
      value: inactive,
      hint: `${ratePct(inactive, members)}% have not completed`,
      icon: 'encourage' as const,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[1.75rem] font-bold tracking-tight text-[var(--admin-fg-strong)]">
            {hello}
          </h1>
          <p className="mt-1 text-[14px] text-[var(--admin-muted)]">
            Here’s what’s happening in your church.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canNotify ? (
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--admin-border-strong)] text-[var(--admin-fg-strong)] hover:border-[var(--admin-accent)]"
            >
              <BellIcon />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#0ea5e9]" />
            </Link>
          ) : null}
          {canPublish ? (
            <Link href="/sermons/new" className="admin-btn-primary">
              + Add sermon
            </Link>
          ) : null}
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => {
          const body = (
            <>
              <MetricIcon kind={m.icon} />
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-[var(--admin-fg-strong)]">{m.label}</p>
                <p className="mt-1 text-[1.75rem] font-bold leading-none tabular-nums text-[var(--admin-fg-strong)]">
                  {engagement ? m.value : '—'}
                </p>
                <p className="mt-1.5 text-[12px] text-[var(--admin-muted)]">{m.hint}</p>
              </div>
            </>
          );
          const className = 'admin-stat-card flex items-start gap-3';
          if ('href' in m && m.href) {
            return (
              <Link
                key={m.label}
                href={m.href}
                className={`${className} transition-colors hover:border-[var(--admin-accent)]`}
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
                Weekly engagement
              </h2>
              <p className="mt-1 text-[13px] leading-snug text-[var(--admin-muted)]">
                Members who opened and completed a devotional (UTC weeks).
              </p>
            </div>
            <div className="inline-flex rounded-full border border-[var(--admin-border-strong)] p-0.5 text-[13px] font-semibold">
              {(['7', '30', '90'] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setRange(id)}
                  className={`rounded-full px-3 py-1 ${
                    range === id
                      ? 'bg-[#0ea5e9] text-white'
                      : 'text-[var(--admin-muted)] hover:text-[var(--admin-fg-strong)]'
                  }`}
                >
                  {id} days
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 h-64 w-full min-h-[16rem]">
            {weeklyPoints.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyPoints} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={chart.gridStroke} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: chart.tickFill, fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: chart.tickFill, fontSize: 12 }} width={28} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chart.tooltip.backgroundColor,
                      border: chart.tooltip.border,
                      borderRadius: 8,
                    }}
                    labelStyle={{ color: chart.tooltip.labelColor }}
                  />
                  <Legend
                    wrapperStyle={{ color: chart.legendColor, fontSize: 12 }}
                    formatter={(value) => <span className="text-[12px]">{value}</span>}
                  />
                  <Line
                    type="monotone"
                    dataKey="opened"
                    name="Opened"
                    stroke={chart.barOpened}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: chart.barOpened, strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke={chart.barCompleted}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: chart.barCompleted, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="admin-hint pt-16 text-center">Engagement will show here after members join.</p>
            )}
          </div>
        </div>

        <div className="admin-card flex flex-col p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/15 text-sky-300">
              <ChartMiniIcon />
            </span>
            <h2 className="text-lg font-semibold text-[var(--admin-fg-strong)]">This week</h2>
          </div>
          {members > 0 ? (
            <>
              <p className="mt-6 text-[2.5rem] font-bold leading-none tracking-tight tabular-nums text-[var(--admin-fg-strong)]">
                {completed} of {members}
              </p>
              <p className="mt-3 text-[15px] leading-snug text-[var(--admin-fg-secondary)]">
                members completed a devotional.
              </p>
              <p className="mt-2 text-[13px] text-[var(--admin-muted)]">
                That’s {ratePct(completed, members)}% completion this week.
              </p>
            </>
          ) : (
            <p className="mt-6 text-[15px] leading-snug text-[var(--admin-fg-secondary)]">
              Invite members to see completion this week.
            </p>
          )}
          <Link
            href="/members"
            className="mt-auto pt-6 text-[14px] font-medium text-[var(--admin-link)] hover:underline"
          >
            View members →
          </Link>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(16rem,1fr)]">
        <div className="admin-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-lg font-semibold text-[var(--admin-fg-strong)]">Recent sermons</h2>
            <Link
              href="/sermons?filter=all"
              className="text-[14px] font-medium text-[var(--admin-link)] hover:underline"
            >
              View all →
            </Link>
          </div>
          {recentSermons.length === 0 ? (
            <p className="admin-hint px-5 pb-5">No sermons yet.</p>
          ) : (
            <table className="w-full text-left text-[14px]">
              <thead className="border-y border-admin text-[11px] font-semibold uppercase tracking-wide text-admin-dim">
                <tr>
                  <th className="px-5 py-2.5">Title</th>
                  <th className="hidden px-5 py-2.5 sm:table-cell">Date</th>
                  <th className="hidden px-5 py-2.5 md:table-cell">Members</th>
                  <th className="px-5 py-2.5">Progress</th>
                  <th className="w-10 px-2 py-2.5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin">
                {recentSermons.map((s) => {
                  const done = sermonCompleted(s.id, engagement);
                  const pct = ratePct(done, members);
                  return (
                    <tr key={s.id} className="hover:bg-admin-nav-hover/40">
                      <td className="px-5 py-3">
                        <Link
                          href={`/sermons/${s.id}`}
                          className="font-medium text-[var(--admin-fg-strong)] hover:text-[var(--admin-link)]"
                        >
                          {s.title}
                        </Link>
                      </td>
                      <td className="admin-hint hidden px-5 py-3 sm:table-cell">
                        {formatSermonDate(s.sermon_date)}
                      </td>
                      <td className="hidden px-5 py-3 tabular-nums text-[13px] text-[var(--admin-fg-secondary)] md:table-cell">
                        {members || '—'}
                      </td>
                      <td className="px-5 py-3">
                        {members > 0 ? (
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-semibold tabular-nums ${
                              pct >= 50
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                                : 'bg-sky-500/15 text-sky-600 dark:text-sky-300'
                            }`}
                          >
                            {done}/{members} ({pct}%)
                          </span>
                        ) : (
                          <span className="text-[13px] text-[var(--admin-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-2 py-3">
                        <Link
                          href={`/sermons/${s.id}`}
                          aria-label={`Open ${s.title}`}
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
            heading="Share with members"
            hint="Help your church join Sermon Recall."
            size="lg"
            showEmail={false}
          />
        ) : (
          <div className="admin-card p-5">
            <h2 className="text-lg font-semibold text-[var(--admin-fg-strong)]">Share with members</h2>
            <p className="admin-hint mt-2">A church code will appear here once your church is set up.</p>
            <Link href="/members#invite" className="mt-4 inline-block text-[13px] font-medium text-[var(--admin-link)]">
              Invite members →
            </Link>
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(16rem,1fr)]">
        <div className="admin-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[var(--admin-fg-strong)]">
              What members are applying
            </h2>
            {commitments.length > COMMITMENT_PREVIEW ? (
              <button
                type="button"
                onClick={() => setShowAllCommitments((v) => !v)}
                className="text-[14px] font-medium text-[var(--admin-link)] hover:underline"
              >
                {showAllCommitments ? 'Show less' : 'View all →'}
              </button>
            ) : null}
          </div>
          <p className="admin-hint mt-1">Recent anonymous commitments.</p>
          {commitments.length ? (
            <ul className="mt-4 space-y-2">
              {(showAllCommitments ? commitments : commitments.slice(0, COMMITMENT_PREVIEW)).map(
                (c, i) => (
                  <li
                    key={`${i}-${c.slice(0, 24)}`}
                    className="flex items-start gap-3 rounded-lg border border-admin px-3.5 py-3"
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
            <p className="admin-hint mt-4">Commitments will show here after members finish a day.</p>
          )}
        </div>

        <div className="admin-card flex flex-col p-5">
          <h2 className="text-lg font-semibold text-[var(--admin-fg-strong)]">
            Catch-up nudge
          </h2>
          {midweekNudge && midweekNudge.phase !== 'none' ? (
            <>
              <p className="admin-body mt-3 flex-1 text-[14px]">{midweekNudgeCopy(midweekNudge)}</p>
              <p className="admin-hint mt-3 text-[12px]">
                Automatic at midday on Day 4 (retries through Day 6). Goes only to members more than
                one day behind who have reminders on.
              </p>
            </>
          ) : canPublish ? (
            <>
              <p className="admin-body mt-3 flex-1 text-[14px]">
                Add this week’s sermon so members have a new six-day journey. Mid-week we’ll nudge
                anyone more than a day behind.
              </p>
              <Link href="/sermons/new" className="admin-btn-primary mt-4 w-full text-center">
                + Add sermon
              </Link>
            </>
          ) : (
            <p className="admin-body mt-3 text-[14px]">
              Mid-week we automatically nudge members who are more than a day behind.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function midweekNudgeCopy(nudge: PastorMidweekNudgeStatus): string {
  const sent = nudge.sent_count;
  const will = nudge.will_send_count;
  if (nudge.phase === 'sent') {
    if (sent === 0) return 'This week’s catch-up nudge has gone out. Nobody was more than a day behind.';
    return sent === 1
      ? 'This week’s catch-up nudge went to 1 member who was more than a day behind.'
      : `This week’s catch-up nudge went to ${sent} members who were more than a day behind.`;
  }
  if (nudge.phase === 'due') {
    if (will === 0) {
      return 'Mid-week window is open. Nobody is more than a day behind right now, so no nudge will send.';
    }
    return will === 1
      ? 'Today’s catch-up nudge will go to 1 member who is more than a day behind (midday, church time).'
      : `Today’s catch-up nudge will go to ${will} members who are more than a day behind (midday, church time).`;
  }
  if (nudge.phase === 'upcoming') {
    if (will === 0) {
      return 'On Day 4 we send a catch-up nudge to anyone more than a day behind. Nobody is that far behind yet.';
    }
    return will === 1
      ? 'On Day 4 we send a catch-up nudge. 1 member is already more than a day behind and would get it.'
      : `On Day 4 we send a catch-up nudge. ${will} members are already more than a day behind and would get it.`;
  }
  if (nudge.phase === 'missed') {
    if (sent > 0) {
      return sent === 1
        ? 'This week’s catch-up nudge went to 1 member.'
        : `This week’s catch-up nudge went to ${sent} members.`;
    }
    return 'The mid-week window has passed. No catch-up nudge was sent — nobody was more than a day behind, or they had reminders off.';
  }
  return 'Mid-week we automatically nudge members who are more than a day behind.';
}

function MetricIcon({ kind }: { kind: 'members' | 'active' | 'completed' | 'encourage' }) {
  const wrap =
    kind === 'encourage'
      ? 'bg-rose-500/15 text-rose-300'
      : kind === 'members'
        ? 'bg-sky-500/15 text-sky-300'
        : 'bg-emerald-500/15 text-emerald-300';
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${wrap}`}>
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
    <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" fill="currentColor" aria-hidden>
      <path d="M7.2 11.2C7.2 8.4 8.9 6.3 11.8 5.2L11 7.4c-1.2.5-1.8 1.4-1.8 2.6.9 0 2.4.5 2.4 2.4 0 1.6-1.2 2.8-2.8 2.8S6 14.6 6 12.8c0-.6.1-1.2.5-1.6-.2-.4-.3-1-.3-1.6 0-2.2 1.5-4.4 5-4.4l-1 2.4C8.4 6.4 7.2 8 7.2 11.2Zm8.8 0c0-2.8 1.7-4.9 4.6-6L19.8 7.4c-1.2.5-1.8 1.4-1.8 2.6.9 0 2.4.5 2.4 2.4 0 1.6-1.2 2.8-2.8 2.8s-2.8-1.2-2.8-3c0-.6.1-1.2.5-1.6-.2-.4-.3-1-.3-1.6 0-2.2 1.5-4.4 5-4.4l-1 2.4c-1.8.6-3 2.2-3 5.4Z" />
    </svg>
  );
}

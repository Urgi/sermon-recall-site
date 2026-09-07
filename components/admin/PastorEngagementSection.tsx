'use client';

import { format, parseISO, startOfWeek } from 'date-fns';
import { useId, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useAdminTheme } from '@/components/admin/ThemeProvider';
import type { PastorEngagementPayload, WeeklyEngagementRow } from '@/lib/engagement/types';
import { getAdminChartTheme } from '@/lib/theme/chart-theme';

type Props = {
  engagement: PastorEngagementPayload | null;
  churchHasMembers: boolean;
};

type MetricId = 'members' | 'opened' | 'completed' | 'inactive';

const METRICS: {
  id: MetricId;
  label: string;
  hint: string;
  chartTitle: string;
  isRate: boolean;
}[] = [
  {
    id: 'members',
    label: 'Members',
    hint: 'Registered in the church',
    chartTitle: 'Members week by week',
    isRate: false,
  },
  {
    id: 'opened',
    label: 'Opened a day (7d)',
    hint: 'Share of members who opened',
    chartTitle: 'Opened rate week by week',
    isRate: true,
  },
  {
    id: 'completed',
    label: 'Completed (7d)',
    hint: 'Share of members who finished a day',
    chartTitle: 'Completed rate week by week',
    isRate: true,
  },
  {
    id: 'inactive',
    label: 'No completion (7d)',
    hint: 'Share of members with no completion',
    chartTitle: 'Inactive rate week by week',
    isRate: true,
  },
];

function weekLabel(ymd: string): string {
  try {
    return format(parseISO(ymd), 'MMM d');
  } catch {
    return ymd;
  }
}

function ratePct(count: number, members: number): number {
  if (members <= 0) return 0;
  return Math.round((1000 * count) / members) / 10;
}

function weeksForChart(engagement: PastorEngagementPayload): WeeklyEngagementRow[] {
  if (engagement.weekly.length > 0) return engagement.weekly;
  return [
    {
      week_start: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      member_count: engagement.member_count,
      opened_count: engagement.opened_this_week,
      completed_count: engagement.active_this_week,
    },
  ];
}

export function PastorEngagementSection({ engagement, churchHasMembers }: Props) {
  const { resolved } = useAdminTheme();
  const chart = getAdminChartTheme(resolved);
  const isLight = resolved === 'light';
  const chartId = useId();
  const [selected, setSelected] = useState<MetricId>('members');

  if (!engagement) {
    return (
      <section className="admin-card p-6">
        <h2 className="admin-section-title">Congregation engagement</h2>
        <p className="admin-body mt-2">
          Engagement metrics could not be loaded. Apply the latest Supabase migration (
          <code className="rounded bg-black/10 px-1 text-[12px] dark:bg-black/40">
            pastor_church_engagement
          </code>
          ) and refresh.
        </p>
      </section>
    );
  }

  const topSermon = engagement.sermons[0];
  const dayChartData =
    topSermon?.days.map((d) => ({
      label: `Day ${d.day_number}`,
      opened: d.opened_count,
      completed: d.completed_count,
    })) ?? [];

  const weeklyPoints = weeksForChart(engagement).map((w) => {
    const inactive = Math.max(w.member_count - w.completed_count, 0);
    return {
      label: weekLabel(w.week_start),
      members: w.member_count,
      opened: w.opened_count,
      completed: w.completed_count,
      inactive,
      openedRate: ratePct(w.opened_count, w.member_count),
      completedRate: ratePct(w.completed_count, w.member_count),
      inactiveRate: ratePct(inactive, w.member_count),
    };
  });

  const selectedMeta = METRICS.find((m) => m.id === selected)!;
  const valueKey =
    selected === 'opened'
      ? 'openedRate'
      : selected === 'completed'
        ? 'completedRate'
        : selected === 'inactive'
          ? 'inactiveRate'
          : 'members';
  const stroke =
    selected === 'opened'
      ? chart.barOpened
      : selected === 'completed'
        ? chart.barCompleted
        : selected === 'inactive'
          ? chart.lineInactive
          : chart.lineMembers;

  const metricValue: Record<MetricId, number> = {
    members: engagement.member_count,
    opened: engagement.opened_this_week,
    completed: engagement.active_this_week,
    inactive: engagement.inactive_this_week,
  };

  const metricClass: Record<MetricId, string> = {
    members: '',
    opened: isLight ? 'text-sky-600' : 'text-sky-300',
    completed: isLight ? 'text-emerald-600' : 'text-emerald-400',
    inactive: isLight ? 'text-rose-600' : 'text-rose-300',
  };

  function selectMetric(id: MetricId) {
    setSelected((current) => (current === id ? 'members' : id));
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="admin-section-title">Congregation engagement</h2>
        <p className="admin-body mt-1">
          Weekly figures use UTC weeks.{' '}
          <strong className="font-medium text-[var(--admin-fg-secondary)]">Opened</strong> is
          members who opened a day.{' '}
          <strong className="font-medium text-[var(--admin-fg-secondary)]">Completed</strong> is
          members who marked a day done. Tap a metric to see its week-by-week rate.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map((metric) => {
          const highlighted = selected === metric.id && metric.id !== 'members';
          return (
            <button
              key={metric.id}
              type="button"
              aria-pressed={highlighted}
              aria-controls={chartId}
              onClick={() => selectMetric(metric.id)}
              className={`admin-stat-card w-full cursor-pointer text-left transition-colors ${
                highlighted
                  ? 'ring-2 ring-[#0ea5e9] ring-offset-2 ring-offset-[var(--admin-page-bg)]'
                  : 'hover:border-[var(--admin-accent)]'
              }`}
            >
              <p className="admin-stat-label">{metric.label}</p>
              <p className={`admin-stat-value ${metricClass[metric.id]}`.trim()}>
                {metricValue[metric.id]}
              </p>
            </button>
          );
        })}
      </div>

      <div id={chartId} className="admin-card p-6">
        <h3 className="text-[15px] font-semibold text-[var(--admin-fg-strong)]">
          {selectedMeta.chartTitle}
        </h3>
        <p className="admin-hint mt-1">{selectedMeta.hint}</p>
          <div className="mt-6 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyPoints} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid stroke={chart.gridStroke} strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: chart.tickFill, fontSize: 12 }} />
                <YAxis
                  allowDecimals={!selectedMeta.isRate}
                  domain={selectedMeta.isRate ? [0, 100] : ['auto', 'auto']}
                  tick={{ fill: chart.tickFill, fontSize: 12 }}
                  width={44}
                  tickFormatter={selectedMeta.isRate ? (v: number) => `${v}%` : undefined}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chart.tooltip.backgroundColor,
                    border: chart.tooltip.border,
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: chart.tooltip.labelColor }}
                  formatter={(value, _name, item) => {
                    const row = item?.payload as (typeof weeklyPoints)[number] | undefined;
                    if (!row) return [String(value ?? ''), selectedMeta.label];
                    if (selected === 'members') return [row.members, 'Members'];
                    if (selected === 'opened') {
                      return [`${row.openedRate}% · ${row.opened} of ${row.members}`, 'Opened'];
                    }
                    if (selected === 'completed') {
                      return [
                        `${row.completedRate}% · ${row.completed} of ${row.members}`,
                        'Completed',
                      ];
                    }
                    return [`${row.inactiveRate}% · ${row.inactive} of ${row.members}`, 'Inactive'];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey={valueKey}
                  name={selectedMeta.label}
                  stroke={stroke}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: stroke }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      {!churchHasMembers ? (
        <p className="admin-empty-hint">
          When members join with your church code and open or complete days, charts will appear
          here.
        </p>
      ) : null}

      {topSermon && dayChartData.length > 0 ? (
        <div className="admin-card p-6">
          <h3 className="text-[15px] font-semibold text-[var(--admin-fg-strong)]">
            Opens vs completions by day — latest sermon
          </h3>
          <p className="admin-hint mt-1 truncate" title={topSermon.title}>
            {topSermon.title}
          </p>
          <div className="mt-6 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayChartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid stroke={chart.gridStroke} strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: chart.tickFill, fontSize: 12 }} />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: chart.tickFill, fontSize: 12 }}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chart.tooltip.backgroundColor,
                    border: chart.tooltip.border,
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: chart.tooltip.labelColor }}
                />
                <Legend wrapperStyle={{ color: chart.legendColor, fontSize: 12 }} />
                <Bar
                  name="Opened"
                  dataKey="opened"
                  fill={chart.barOpened}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  name="Completed"
                  dataKey="completed"
                  fill={chart.barCompleted}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : churchHasMembers ? (
        <p className="admin-hint text-[14px]">
          Publish devotionals for a sermon to see per-day open and completion counts.
        </p>
      ) : null}

      {engagement.sample_commitments.length > 0 ? (
        <div className="admin-card p-6">
          <h3 className="text-[15px] font-semibold text-[var(--admin-fg-strong)]">
            What members said they would do
          </h3>
          <p className="admin-hint mt-1">
            At the end of a day, members write one thing they will put into practice. These are
            anonymous — no names.
          </p>
          <ul className="mt-4 space-y-3">
            {engagement.sample_commitments.map((c, i) => (
              <li key={`${i}-${c.slice(0, 24)}`} className="admin-quote-item">
                “{c.length > 280 ? `${c.slice(0, 277)}…` : c}”
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

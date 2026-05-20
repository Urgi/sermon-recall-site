'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useAdminTheme } from '@/components/admin/ThemeProvider';
import type { PastorEngagementPayload } from '@/lib/engagement/types';
import { getAdminChartTheme } from '@/lib/theme/chart-theme';

type Props = {
  engagement: PastorEngagementPayload | null;
  churchHasMembers: boolean;
};

export function PastorEngagementSection({ engagement, churchHasMembers }: Props) {
  const { resolved } = useAdminTheme();
  const chart = getAdminChartTheme(resolved);
  const isLight = resolved === 'light';

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
  const chartData =
    topSermon?.days.map((d) => ({
      label: `Day ${d.day_number}`,
      opened: d.opened_count,
      completed: d.completed_count,
    })) ?? [];

  return (
    <section className="space-y-6">
      <div>
        <h2 className="admin-section-title">Congregation engagement</h2>
        <p className="admin-body mt-1">
          <strong className="font-medium text-[var(--admin-fg-secondary)]">Opened</strong> counts
          members who opened that day in the app (or already had reading progress).{' '}
          <strong className="font-medium text-[var(--admin-fg-secondary)]">Completed</strong> is
          “Mark day complete.” Weekly figures use the last 7 days in UTC, same as before.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="admin-stat-card">
          <p className="admin-stat-label">Members</p>
          <p className="admin-stat-value">{engagement.member_count}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Opened a day (7d)</p>
          <p
            className={`admin-stat-value ${isLight ? 'text-sky-600' : 'text-sky-300'}`}
          >
            {engagement.opened_this_week}
          </p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Completed (7d)</p>
          <p
            className={`admin-stat-value ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}
          >
            {engagement.active_this_week}
          </p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">No completion (7d)</p>
          <p
            className={`admin-stat-value ${isLight ? 'text-rose-600' : 'text-rose-300'}`}
          >
            {engagement.inactive_this_week}
          </p>
        </div>
      </div>

      {!churchHasMembers ? (
        <p className="admin-empty-hint">
          When members join with your church code and open or complete days, charts will appear
          here.
        </p>
      ) : null}

      {topSermon && chartData.length > 0 ? (
        <div className="admin-card p-6">
          <h3 className="text-[15px] font-semibold text-[var(--admin-fg-strong)]">
            Opens vs completions by day — latest sermon
          </h3>
          <p className="admin-hint mt-1 truncate" title={topSermon.title}>
            {topSermon.title}
          </p>
          <div className="mt-6 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
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
            Application commitments (sample)
          </h3>
          <p className="admin-hint mt-1">
            Short excerpts from member submissions — names are not shown.
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

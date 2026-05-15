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

import type { PastorEngagementPayload } from '@/lib/engagement/types';

type Props = {
  engagement: PastorEngagementPayload | null;
  churchHasMembers: boolean;
};

export function PastorEngagementSection({ engagement, churchHasMembers }: Props) {
  if (!engagement) {
    return (
      <section className="rounded-xl border border-slate-700/80 bg-[#0a0f18] p-6">
        <h2 className="text-lg font-semibold text-white">Congregation engagement</h2>
        <p className="mt-2 text-[14px] text-[#94a3b8]">
          Engagement metrics could not be loaded. Apply the latest Supabase migration (
          <code className="rounded bg-black/40 px-1 text-[12px]">pastor_church_engagement</code>
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
        <h2 className="text-lg font-semibold text-white">Congregation engagement</h2>
        <p className="mt-1 text-[14px] text-[#94a3b8]">
          <strong className="font-medium text-[#cbd5e1]">Opened</strong> counts members who opened
          that day in the app (or already had reading progress).{' '}
          <strong className="font-medium text-[#cbd5e1]">Completed</strong> is “Mark day complete.”
          Weekly figures use the last 7 days in UTC, same as before.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[rgba(56,189,248,0.12)] bg-[#0a0f18] p-5">
          <p className="text-[13px] font-medium uppercase tracking-wide text-[#64748b]">
            Members
          </p>
          <p className="mt-2 text-3xl font-bold text-white">{engagement.member_count}</p>
        </div>
        <div className="rounded-xl border border-[rgba(56,189,248,0.2)] bg-[#0a0f18] p-5">
          <p className="text-[13px] font-medium uppercase tracking-wide text-[#64748b]">
            Opened a day (7d)
          </p>
          <p className="mt-2 text-3xl font-bold text-sky-300">{engagement.opened_this_week}</p>
        </div>
        <div className="rounded-xl border border-[rgba(34,197,94,0.2)] bg-[#0a0f18] p-5">
          <p className="text-[13px] font-medium uppercase tracking-wide text-[#64748b]">
            Completed (7d)
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-400">{engagement.active_this_week}</p>
        </div>
        <div className="rounded-xl border border-[rgba(248,113,113,0.15)] bg-[#0a0f18] p-5">
          <p className="text-[13px] font-medium uppercase tracking-wide text-[#64748b]">
            No completion (7d)
          </p>
          <p className="mt-2 text-3xl font-bold text-rose-300/90">{engagement.inactive_this_week}</p>
        </div>
      </div>

      {!churchHasMembers ? (
        <p className="rounded-lg border border-dashed border-[#334155] bg-[#0f172a]/60 px-4 py-3 text-[14px] text-[#94a3b8]">
          When members join with your church code and open or complete days, charts will appear
          here.
        </p>
      ) : null}

      {topSermon && chartData.length > 0 ? (
        <div className="rounded-xl border border-[rgba(56,189,248,0.12)] bg-[#0a0f18] p-6">
          <h3 className="text-[15px] font-semibold text-white">
            Opens vs completions by day — latest sermon
          </h3>
          <p className="mt-1 truncate text-[13px] text-[#94a3b8]" title={topSermon.title}>
            {topSermon.title}
          </p>
          <div className="mt-6 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 12 }} width={36} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                <Bar
                  name="Opened"
                  dataKey="opened"
                  fill="#7dd3fc"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  name="Completed"
                  dataKey="completed"
                  fill="#38bdf8"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : churchHasMembers ? (
        <p className="text-[14px] text-[#64748b]">
          Publish devotionals for a sermon to see per-day open and completion counts.
        </p>
      ) : null}

      {engagement.sample_commitments.length > 0 ? (
        <div className="rounded-xl border border-[rgba(56,189,248,0.12)] bg-[#0a0f18] p-6">
          <h3 className="text-[15px] font-semibold text-white">Application commitments (sample)</h3>
          <p className="mt-1 text-[13px] text-[#64748b]">
            Short excerpts from member submissions — names are not shown.
          </p>
          <ul className="mt-4 space-y-3">
            {engagement.sample_commitments.map((c, i) => (
              <li
                key={`${i}-${c.slice(0, 24)}`}
                className="rounded-lg border border-[#1e293b] bg-[#020617]/40 px-4 py-3 text-[14px] leading-relaxed text-[#cbd5e1]"
              >
                “{c.length > 280 ? `${c.slice(0, 277)}…` : c}”
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

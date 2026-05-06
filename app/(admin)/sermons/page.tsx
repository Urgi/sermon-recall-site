import Link from 'next/link';

import { canManageSermons } from '@/lib/auth/profile';
import { requireAdminSession } from '@/lib/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function statusStyle(status: string) {
  switch (status) {
    case 'ready':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'failed':
      return 'bg-red-500/15 text-red-300 border-red-500/30';
    default:
      return 'bg-amber-500/15 text-amber-200 border-amber-500/30';
  }
}

export default async function SermonsListPage() {
  const { profile } = await requireAdminSession();
  const supabase = createServerSupabaseClient();
  const canPublish = canManageSermons(profile.role);

  const { data: sermons } = profile.church_id
    ? await supabase
        .from('sermons')
        .select('id, title, sermon_date, pastor_name, status, created_at')
        .eq('church_id', profile.church_id)
        .order('created_at', { ascending: false })
    : { data: [] };

  const rows = sermons ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Sermons</h1>
          <p className="mt-2 text-[15px] text-[#94a3b8]">
            Ingestion status and links for review. Pipeline automation can update status later.
          </p>
        </div>
        {canPublish && profile.church_id ? (
          <Link
            href="/sermons/new"
            className="rounded-lg bg-[#0ea5e9] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0284c7]"
          >
            Add sermon
          </Link>
        ) : null}
      </div>

      {!profile.church_id ? (
        <p className="text-[15px] text-[#94a3b8]">
          Create or join a church from the{' '}
          <Link href="/dashboard" className="text-[#38bdf8] hover:underline">
            dashboard
          </Link>{' '}
          to see sermons.
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-[rgba(56,189,248,0.12)] bg-[#0a0f18] p-10 text-center">
          <p className="text-[15px] text-[#94a3b8]">No sermons yet.</p>
          {canPublish ? (
            <Link
              href="/sermons/new"
              className="mt-4 inline-block text-[15px] font-medium text-[#38bdf8] hover:underline"
            >
              Add your first sermon
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[rgba(56,189,248,0.12)]">
          <table className="w-full text-left text-[14px]">
            <thead className="border-b border-[rgba(56,189,248,0.12)] bg-[#0a0f18] text-[12px] font-semibold uppercase tracking-wide text-[#64748b]">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="hidden px-4 py-3 sm:table-cell">Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(56,189,248,0.08)] bg-[#05070a]">
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-[#0a0f18]/80">
                  <td className="px-4 py-3">
                    <Link
                      href={`/sermons/${s.id}`}
                      className="font-medium text-[#38bdf8] hover:underline"
                    >
                      {s.title}
                    </Link>
                    {s.pastor_name ? (
                      <p className="mt-0.5 text-[12px] text-[#64748b]">{s.pastor_name}</p>
                    ) : null}
                  </td>
                  <td className="hidden px-4 py-3 text-[#94a3b8] sm:table-cell">
                    {s.sermon_date ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full border px-2.5 py-0.5 text-[12px] font-medium capitalize ${statusStyle(s.status)}`}
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import Link from 'next/link';

import { workflowStatusBadgeClass, workflowStatusLabel } from '@/lib/admin/workflow-status';
import type { SermonWorkflowStatus } from '@/lib/admin/workflow-status';
import { canManageSermonsWithStaff } from '@/lib/auth/profile';
import { requireAdminSession } from '@/lib/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function SermonsListPage() {
  const { profile, staffRole, isApprovedStaff } = await requireAdminSession();
  const supabase = createServerSupabaseClient();
  const canPublish = isApprovedStaff && canManageSermonsWithStaff(profile, staffRole);

  const { data: sermons } = profile.church_id
    ? await supabase
        .from('sermons')
        .select('id, title, sermon_date, pastor_name, status, workflow_status, created_at')
        .eq('church_id', profile.church_id)
        .order('created_at', { ascending: false })
    : { data: [] };

  const rows = sermons ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="admin-heading">Sermons</h1>
          <p className="admin-body mt-2">Ingestion status and devotional workflow.</p>
        </div>
        {canPublish && profile.church_id ? (
          <Link href="/sermons/new" className="admin-btn-primary">
            Add sermon
          </Link>
        ) : null}
      </div>

      {!profile.church_id ? (
        <p className="admin-body">
          Create or join a church from the{' '}
          <Link href="/dashboard" className="text-admin-link hover:underline">
            dashboard
          </Link>
          .
        </p>
      ) : rows.length === 0 ? (
        <div className="admin-card p-10 text-center">
          <p className="admin-body">No sermons yet.</p>
          {canPublish ? (
            <Link href="/sermons/new" className="mt-4 inline-block text-admin-link hover:underline">
              Add your first sermon
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <table className="w-full text-left text-[14px]">
            <thead className="border-b border-admin bg-admin-surface text-[12px] font-semibold uppercase tracking-wide text-admin-dim">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="hidden px-4 py-3 sm:table-cell">Date</th>
                <th className="px-4 py-3">Workflow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin">
              {rows.map((s) => {
                const wf = (s.workflow_status as SermonWorkflowStatus) ?? 'draft';
                return (
                  <tr key={s.id} className="hover:bg-admin-nav-hover/50">
                    <td className="px-4 py-3">
                      <Link href={`/sermons/${s.id}`} className="font-medium text-admin-link hover:underline">
                        {s.title}
                      </Link>
                      {s.pastor_name ? <p className="admin-hint mt-0.5">{s.pastor_name}</p> : null}
                    </td>
                    <td className="admin-body hidden px-4 py-3 sm:table-cell">{s.sermon_date ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={workflowStatusBadgeClass(wf)}>{workflowStatusLabel(wf)}</span>
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

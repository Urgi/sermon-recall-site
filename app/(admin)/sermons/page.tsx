import Link from 'next/link';

import { SermonsInbox, type SermonsInboxRow } from '@/components/admin/SermonsInbox';
import { pastorLifecycle } from '@/lib/admin/workflow-status';
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
        .select('id, title, sermon_date, pastor_name, status, transcript_status, workflow_status, created_at')
        .eq('church_id', profile.church_id)
        .order('created_at', { ascending: false })
    : { data: [] };

  const rows: SermonsInboxRow[] = (sermons ?? []).map((s) => ({
    id: s.id as string,
    title: s.title as string,
    sermon_date: (s.sermon_date as string | null) ?? null,
    pastor_name: (s.pastor_name as string | null) ?? null,
    lifecycle: pastorLifecycle({
      workflow: ((s.workflow_status as SermonWorkflowStatus) ?? 'draft') as SermonWorkflowStatus,
      ingestStatus: (s.status as string | null) ?? null,
      transcriptStatus: (s.transcript_status as string | null) ?? null,
    }),
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="admin-heading">Sermons</h1>
          <p className="admin-body mt-2">
            Review, processing, and publish status for every sermon.
          </p>
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
        <SermonsInbox rows={rows} />
      )}
    </div>
  );
}

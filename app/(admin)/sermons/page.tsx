import Link from 'next/link';
import { Suspense } from 'react';

import { AdminPageFallback } from '@/components/admin/AdminPageFallback';
import { SermonsInbox, type SermonsInboxRow } from '@/components/admin/SermonsInbox';
import { parseSermonsFilter } from '@/lib/admin/sermons-filter';
import { pastorLifecycle } from '@/lib/admin/workflow-status';
import type { SermonWorkflowStatus } from '@/lib/admin/workflow-status';
import { canManageSermonsWithStaff } from '@/lib/auth/profile';
import { requireAdminSession } from '@/lib/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type Props = { searchParams: { filter?: string } };

export default function SermonsListPage(props: Props) {
  return (
    <Suspense fallback={<AdminPageFallback />}>
      <SermonsListBody {...props} />
    </Suspense>
  );
}

async function SermonsListBody({ searchParams }: Props) {
  const { profile, staffRole, isApprovedStaff } = await requireAdminSession();
  const supabase = createServerSupabaseClient();
  const canPublish = isApprovedStaff && canManageSermonsWithStaff(profile, staffRole);

  const { data: sermons } = profile.church_id
    ? await supabase
        .from('sermons')
        .select(
          'id, title, sermon_date, pastor_name, status, transcript_status, workflow_status, created_at, key_themes, devotionals(day_number, scripture_reference)',
        )
        .eq('church_id', profile.church_id)
        .order('created_at', { ascending: false })
    : { data: [] };

  const rows: SermonsInboxRow[] = (sermons ?? []).map((s) => {
    const themes = (s.key_themes as string[] | null) ?? [];
    const series = themes.map((t) => t.trim()).find(Boolean) ?? null;
    const days = (s.devotionals as { day_number: number; scripture_reference: string | null }[] | null) ?? [];
    const scripture =
      days.find((d) => d.day_number === 1)?.scripture_reference?.trim() ||
      days.map((d) => d.scripture_reference?.trim()).find(Boolean) ||
      null;
    return {
      id: s.id as string,
      title: s.title as string,
      sermon_date: (s.sermon_date as string | null) ?? null,
      pastor_name: (s.pastor_name as string | null) ?? null,
      scripture,
      series,
      lifecycle: pastorLifecycle({
        workflow: ((s.workflow_status as SermonWorkflowStatus) ?? 'draft') as SermonWorkflowStatus,
        ingestStatus: (s.status as string | null) ?? null,
        transcriptStatus: (s.transcript_status as string | null) ?? null,
      }),
    };
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="admin-heading">Sermons</h1>
          <p className="admin-body mt-2">
            Upload sermons and turn them into devotionals for your church.
          </p>
        </div>
        {canPublish && profile.church_id ? (
          <Link href="/sermons/new" className="admin-btn-primary inline-flex items-center gap-2">
            <UploadIcon />
            Upload sermon
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
      ) : (
        <SermonsInbox
          rows={rows}
          initialFilter={parseSermonsFilter(searchParams.filter)}
          canDelete={canPublish}
        />
      )}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M12 16V5M8 8l4-4 4 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 16v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

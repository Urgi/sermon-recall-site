import { notFound } from 'next/navigation';

import {
  canManageSermonsWithStaff,
  staffHasPermission,
} from '@/lib/auth/profile';
import type { SermonWorkflowStatus } from '@/lib/admin/workflow-status';
import { requireAdminSession } from '@/lib/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SermonPublishWizard } from '@/components/admin/SermonPublishWizard';

type Props = { params: { id: string } };

export default async function SermonDetailPage({ params }: Props) {
  const { profile, staffRole } = await requireAdminSession();
  const supabase = createServerSupabaseClient();

  const { data: sermon } = await supabase
    .from('sermons')
    .select(
      'id, title, pastor_name, sermon_date, source_url, transcript, status, workflow_status, summary, created_at, changes_requested_note, churches(require_devotional_approval, pastor_name)',
    )
    .eq('id', params.id)
    .single();

  if (!sermon) {
    notFound();
  }

  const { data: devotionals } = await supabase
    .from('devotionals')
    .select(
      'id, day_number, title, main_content, scripture_reference, scripture_text, reflection_question, estimated_minutes, pre_prompt',
    )
    .eq('sermon_id', params.id)
    .order('day_number', { ascending: true });

  const days = devotionals ?? [];
  const canEdit = canManageSermonsWithStaff(profile, staffRole);
  const canApprove = staffHasPermission(staffRole, profile, 'can_approve_devotionals');
  const canPublish = staffHasPermission(staffRole, profile, 'can_publish_devotionals');
  const canSubmit = staffHasPermission(staffRole, profile, 'can_submit_for_approval');
  const hasTranscript = Boolean(sermon.transcript?.trim());
  const churchEmbedRaw = sermon.churches as
    | { require_devotional_approval: boolean; pastor_name?: string | null }
    | { require_devotional_approval: boolean; pastor_name?: string | null }[]
    | null;
  const churchEmbed = Array.isArray(churchEmbedRaw) ? churchEmbedRaw[0] : churchEmbedRaw;
  const approvalRequired = churchEmbed?.require_devotional_approval !== false;
  const workflowStatus = (sermon.workflow_status as SermonWorkflowStatus) ?? 'draft';

  if (!profile.church_id) {
    notFound();
  }

  return (
    <SermonPublishWizard
      sermonId={sermon.id}
      churchId={profile.church_id}
      sermonTitle={sermon.title}
      pastorName={sermon.pastor_name ?? ''}
      churchPastorName={churchEmbed?.pastor_name ?? null}
      sermonDate={sermon.sermon_date ?? ''}
      transcript={sermon.transcript ?? ''}
      hasTranscript={hasTranscript}
      savedDays={days}
      approvalRequired={approvalRequired}
      workflowStatus={workflowStatus}
      changesRequestedNote={sermon.changes_requested_note}
      canEdit={canEdit}
      canApprove={canApprove}
      canPublish={canPublish}
      canSubmit={canSubmit}
    />
  );
}

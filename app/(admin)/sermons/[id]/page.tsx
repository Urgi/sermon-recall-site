import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  canManageSermonsWithStaff,
  staffHasPermission,
} from '@/lib/auth/profile';
import type { SermonWorkflowStatus } from '@/lib/admin/workflow-status';
import { workflowStatusBadgeClass, workflowStatusLabel } from '@/lib/admin/workflow-status';
import { requireAdminSession } from '@/lib/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { EditableDevotionalPreview } from '@/components/admin/EditableDevotionalPreview';
import { GeminiDevotionalWorkflow } from '@/components/admin/GeminiDevotionalWorkflow';
import { SermonWorkflowPanel } from '@/components/admin/SermonWorkflowPanel';
import { DemoSimulateEarlyDaysPanel } from '@/components/admin/DemoSimulateEarlyDaysPanel';
import { SermonTranscriptLinkCard } from '@/components/admin/SermonTranscriptLinkCard';
import { SermonTranscriptUpload } from '@/components/admin/SermonTranscriptUpload';
import { DeleteSermonButton } from '@/components/admin/DeleteSermonButton';

type Props = { params: { id: string } };

export default async function SermonDetailPage({ params }: Props) {
  const { profile, staffRole } = await requireAdminSession();
  const supabase = createServerSupabaseClient();

  const { data: sermon } = await supabase
    .from('sermons')
    .select(
      'id, title, pastor_name, sermon_date, source_url, transcript, status, workflow_status, summary, created_at, changes_requested_note, churches(require_devotional_approval)',
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
    | { require_devotional_approval: boolean }
    | { require_devotional_approval: boolean }[]
    | null;
  const churchEmbed = Array.isArray(churchEmbedRaw) ? churchEmbedRaw[0] : churchEmbedRaw;
  const approvalRequired = churchEmbed?.require_devotional_approval !== false;
  const workflowStatus = (sermon.workflow_status as SermonWorkflowStatus) ?? 'draft';

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link href="/sermons" className="admin-hint font-medium hover:text-admin-accent">
          ← All sermons
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="admin-heading">{sermon.title}</h1>
            <p className="admin-body mt-2">
              {[sermon.pastor_name, sermon.sermon_date].filter(Boolean).join(' · ') || '—'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={workflowStatusBadgeClass(workflowStatus)}>
              {workflowStatusLabel(workflowStatus)}
            </span>
            <span className="admin-hint capitalize">{sermon.status}</span>
            {canEdit ? (
              <DeleteSermonButton sermonId={sermon.id} sermonTitle={sermon.title} />
            ) : null}
          </div>
        </div>

        {canEdit ? (
          <SermonWorkflowPanel
            sermonId={sermon.id}
            workflowStatus={workflowStatus}
            approvalRequired={approvalRequired}
            canApprove={canApprove}
            canPublish={canPublish}
            changesRequestedNote={sermon.changes_requested_note}
          />
        ) : null}

        {canEdit && !hasTranscript ? <SermonTranscriptUpload sermonId={sermon.id} /> : null}
      </div>

      {hasTranscript ? (
        <section>
          <SermonTranscriptLinkCard
            sermonId={sermon.id}
            characterCount={sermon.transcript!.trim().length}
          />
        </section>
      ) : null}

      <section>
        <h2 className="admin-section-title">Six-day devotionals</h2>
        <p className="admin-body mt-1">
          {canEdit
            ? 'We build a preview automatically when your sermon text is ready. Submit or publish when you’re happy with it.'
            : 'Read-only view.'}
        </p>

        {canEdit ? (
          <div className="mt-4 admin-card p-5">
            <GeminiDevotionalWorkflow
              sermonId={sermon.id}
              churchId={profile.church_id!}
              sermonTitle={sermon.title}
              pastorName={sermon.pastor_name ?? ''}
              sermonDate={sermon.sermon_date ?? ''}
              transcript={sermon.transcript ?? ''}
              hasTranscript={hasTranscript}
              hasExistingDevotionals={days.length > 0}
              approvalRequired={approvalRequired}
              workflowStatus={workflowStatus}
              canPublish={canPublish}
              canSubmit={canSubmit}
            />
          </div>
        ) : null}

        {days.length === 0 ? (
          canEdit ? null : (
            <div className="admin-card mt-4 border-dashed p-8 text-center">
              <p className="admin-body">No devotionals yet.</p>
            </div>
          )
        ) : (
          <ul className="mt-4 space-y-6">
            {days.map((d) => (
              <EditableDevotionalPreview
                key={d.id}
                sermonTitle={sermon.title}
                canEdit={canEdit}
                devotional={{
                  id: d.id,
                  day_number: d.day_number,
                  title: d.title,
                  main_content: d.main_content,
                  scripture_reference: d.scripture_reference,
                  scripture_text: d.scripture_text,
                  reflection_question: d.reflection_question,
                  estimated_minutes: d.estimated_minutes,
                  pre_prompt: d.pre_prompt,
                }}
              />
            ))}
          </ul>
        )}
        {canEdit && days.length > 0 ? (
          <div className="mt-8">
            <DemoSimulateEarlyDaysPanel sermonId={sermon.id} />
          </div>
        ) : null}
      </section>
    </div>
  );
}

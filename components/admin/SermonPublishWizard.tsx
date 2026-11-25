'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { useLanguage } from '@/components/i18n/LanguageProvider';
import { DeleteSermonButton } from '@/components/admin/DeleteSermonButton';
import { DemoSimulateEarlyDaysPanel } from '@/components/admin/DemoSimulateEarlyDaysPanel';
import { EditableDevotionalPreview } from '@/components/admin/EditableDevotionalPreview';
import { GeminiDevotionalWorkflow } from '@/components/admin/GeminiDevotionalWorkflow';
import { SermonTranscriptLinkCard } from '@/components/admin/SermonTranscriptLinkCard';
import { SermonWizardProgress } from '@/components/admin/SermonWizardProgress';
import { SermonWorkflowPanel } from '@/components/admin/SermonWorkflowPanel';
import type { SermonWorkflowStatus } from '@/lib/admin/workflow-status';
import { sermonWizardCopy } from '@/lib/admin/sermon-wizard';
import type { DevotionalDay } from '@/lib/devotionals/devotional-days';

type SavedDay = {
  id: string;
  day_number: number;
  title: string | null;
  main_content: string | null;
  scripture_reference: string | null;
  scripture_text: string | null;
  reflection_question: string | null;
  estimated_minutes: number | null;
  pre_prompt: string | null;
};

type Props = {
  sermonId: string;
  churchId: string;
  sermonTitle: string;
  pastorName: string;
  churchPastorName: string | null;
  sermonDate: string;
  transcript: string;
  hasTranscript: boolean;
  savedDays: SavedDay[];
  approvalRequired: boolean;
  workflowStatus: SermonWorkflowStatus;
  changesRequestedNote: string | null;
  canEdit: boolean;
  canApprove: boolean;
  canPublish: boolean;
  canSubmit: boolean;
};

export function SermonPublishWizard({
  sermonId,
  churchId,
  sermonTitle,
  pastorName,
  churchPastorName,
  sermonDate,
  transcript,
  hasTranscript,
  savedDays,
  approvalRequired,
  workflowStatus,
  changesRequestedNote,
  canEdit,
  canApprove,
  canPublish,
  canSubmit,
}: Props) {
  const router = useRouter();
  const { t } = useLanguage();
  const hasExistingDevotionals = savedDays.length > 0;
  const [previewDays, setPreviewDays] = useState<DevotionalDay[] | null>(null);
  const onPreviewDaysChange = useCallback((days: DevotionalDay[] | null) => {
    setPreviewDays(days);
  }, []);

  const copy = sermonWizardCopy('review', {
    canApprove,
    pastorName: churchPastorName,
  });
  const contextBits = [sermonTitle, pastorName, sermonDate].filter(Boolean);
  const published = workflowStatus === 'published';
  const showSavedDays = hasExistingDevotionals && !previewDays;

  return (
    <div className="mx-auto max-w-xl space-y-8 sm:max-w-3xl">
      <SermonWizardProgress
        step="review"
        title={published ? t('wiz.live') : copy.title}
        hint={
          published
            ? t('wiz.liveHint')
            : copy.hint
        }
        context={contextBits.join(' · ')}
        onBack={() => router.push('/sermons')}
        action={
          canEdit ? (
            <DeleteSermonButton
              sermonId={sermonId}
              sermonTitle={sermonTitle}
              published={published}
            />
          ) : null
        }
      />

      {hasTranscript ? (
        <SermonTranscriptLinkCard sermonId={sermonId} characterCount={transcript.trim().length} />
      ) : null}

      {canEdit &&
      ['submitted_for_approval', 'approved', 'changes_requested', 'published'].includes(
        workflowStatus,
      ) ? (
        <SermonWorkflowPanel
          sermonId={sermonId}
          workflowStatus={workflowStatus}
          approvalRequired={approvalRequired}
          canApprove={canApprove}
          canPublish={canPublish}
          changesRequestedNote={changesRequestedNote}
          hideApproveAction
        />
      ) : null}

      {canEdit ? (
        <GeminiDevotionalWorkflow
          sermonId={sermonId}
          churchId={churchId}
          sermonTitle={sermonTitle}
          pastorName={pastorName}
          sermonDate={sermonDate}
          transcript={transcript}
          hasTranscript={hasTranscript}
          hasExistingDevotionals={hasExistingDevotionals}
          approvalRequired={approvalRequired}
          workflowStatus={workflowStatus}
          canPublish={canPublish}
          canSubmit={canSubmit}
          canApprove={canApprove}
          churchPastorName={churchPastorName}
          onPreviewDaysChange={onPreviewDaysChange}
        />
      ) : (
        <p className="admin-body">{t('wiz.readOnly')}</p>
      )}

      {showSavedDays ? (
        <ul className="space-y-6">
          {savedDays.map((d) => (
            <EditableDevotionalPreview
              key={d.id}
              sermonTitle={sermonTitle}
              canEdit={canEdit}
              devotional={{
                id: d.id,
                day_number: d.day_number,
                title: d.title,
                main_content: d.main_content,
                scripture_reference: d.scripture_reference,
                scripture_text: d.scripture_text,
                reflection_question: d.reflection_question,
                estimated_minutes: d.estimated_minutes ?? 3,
                pre_prompt: d.pre_prompt,
              }}
            />
          ))}
        </ul>
      ) : null}

      {/* Developer demo helper: opt-in only, never shown to pastors by default. */}
      {canEdit && published && hasExistingDevotionals && process.env.NEXT_PUBLIC_DEMO_TOOLS === '1' ? (
        <DemoSimulateEarlyDaysPanel sermonId={sermonId} />
      ) : null}

      {canEdit ? (
        <section className="rounded-xl border border-red-500/25 bg-red-950/15 p-5">
          <h2 className="text-[15px] font-semibold text-red-700 dark:text-red-200">{t('wiz.deleteTitle')}</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--admin-muted)]">
            {t('wiz.deleteHint')}
          </p>
          <div className="mt-4">
            <DeleteSermonButton
              sermonId={sermonId}
              sermonTitle={sermonTitle}
              published={published}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

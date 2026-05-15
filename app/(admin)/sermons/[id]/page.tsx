import Link from 'next/link';
import { notFound } from 'next/navigation';

import { canManageSermons } from '@/lib/auth/profile';
import { requireAdminSession } from '@/lib/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { EditableDevotionalPreview } from '@/components/admin/EditableDevotionalPreview';
import { GeminiDevotionalWorkflow } from '@/components/admin/GeminiDevotionalWorkflow';
import { SeedStubDevotionalsButton } from '@/components/admin/SeedStubDevotionalsButton';
import { DemoSimulateEarlyDaysPanel } from '@/components/admin/DemoSimulateEarlyDaysPanel';
import { SermonTranscriptUpload } from '@/components/admin/SermonTranscriptUpload';

type Props = { params: { id: string } };

export default async function SermonDetailPage({ params }: Props) {
  const { profile } = await requireAdminSession();
  const supabase = createServerSupabaseClient();

  const { data: sermon } = await supabase
    .from('sermons')
    .select(
      'id, title, pastor_name, sermon_date, source_url, transcript, status, summary, created_at',
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
  const canEdit = canManageSermons(profile.role);
  const hasTranscript = Boolean(sermon.transcript?.trim());

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link
          href="/sermons"
          className="text-[13px] font-medium text-[#64748b] hover:text-[#38bdf8]"
        >
          ← All sermons
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{sermon.title}</h1>
            <p className="mt-2 text-[14px] text-[#94a3b8]">
              {[sermon.pastor_name, sermon.sermon_date].filter(Boolean).join(' · ') || '—'}
            </p>
          </div>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[12px] font-medium capitalize text-amber-200">
            {sermon.status}
          </span>
        </div>
        {canEdit ? <SermonTranscriptUpload sermonId={sermon.id} /> : null}
        {sermon.transcript ? (
          <div className="mt-6 rounded-xl border border-[rgba(56,189,248,0.12)] bg-[#0a0f18] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#64748b]">
              Sermon script & notes
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-[#e2e8f0]">
              {sermon.transcript}
            </p>
          </div>
        ) : null}
        {sermon.source_url ? (
          <p className="mt-4 break-all text-[14px]">
            <span className="text-[#64748b]">Legacy source URL: </span>
            <a
              href={sermon.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#38bdf8] hover:underline"
            >
              {sermon.source_url}
            </a>
          </p>
        ) : null}
        {sermon.summary ? (
          <div className="mt-6 rounded-xl border border-[rgba(56,189,248,0.12)] bg-[#0a0f18] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#64748b]">
              Summary
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-[#e2e8f0]">
              {sermon.summary}
            </p>
          </div>
        ) : null}
      </div>

      <section>
        <h2 className="text-lg font-semibold text-white">Six-day devotionals</h2>
        <p className="mt-1 text-[14px] text-[#94a3b8]">
          {canEdit
            ? 'Gemini builds a preview first; publish when ready. Or use quick placeholders. Saved days can be edited below.'
            : 'Member-style preview. Pastor role required to edit titles.'}
        </p>

        {canEdit ? (
          <div className="mt-4 flex flex-col gap-4 rounded-xl border border-violet-500/20 bg-violet-950/20 p-5 wide:flex-row wide:items-start wide:justify-between">
            <div className="max-w-lg space-y-1">
              <p className="text-[13px] font-semibold text-violet-200">AI generation (Gemini)</p>
              <p className="text-[13px] leading-relaxed text-[#94a3b8]">
                Uses the sermon transcript on this page (paste, upload .txt, or transcribe
                audio/video above). Set{' '}
                <code className="rounded bg-black/40 px-1 py-0.5 text-[12px] text-violet-200">
                  GEMINI_API_KEY
                </code>{' '}
                in <code className="text-[12px] text-[#94a3b8]">site/.env</code> (server only — do
                not use EXPO_PUBLIC in the mobile app for keys).
              </p>
            </div>
            <GeminiDevotionalWorkflow
              sermonId={sermon.id}
              sermonTitle={sermon.title}
              hasTranscript={hasTranscript}
              hasExistingDevotionals={days.length > 0}
            />
          </div>
        ) : null}

        {days.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-[rgba(56,189,248,0.2)] bg-[#0a0f18]/50 p-8">
            <p className="text-center text-[15px] text-[#94a3b8]">
              No devotionals yet — the app shows an empty six-day section until you generate or add
              placeholders.
            </p>
            {canEdit ? (
              <div className="mt-6 flex flex-col items-center justify-center gap-6 wide:flex-row wide:flex-wrap">
                <SeedStubDevotionalsButton sermonId={sermon.id} />
              </div>
            ) : (
              <p className="mt-4 text-center text-[13px] text-[#64748b]">
                Pastor role required to create devotionals.
              </p>
            )}
          </div>
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

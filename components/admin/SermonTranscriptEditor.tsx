'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { SermonTranscriptUpload } from '@/components/admin/SermonTranscriptUpload';
import { UnsavedWorkBanner } from '@/components/admin/UnsavedWorkBanner';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

type Props = {
  sermonId: string;
  sermonTitle: string;
  pastorLine: string;
  transcript: string;
  canEdit: boolean;
};

export function SermonTranscriptEditor({
  sermonId,
  sermonTitle,
  pastorLine,
  transcript,
  canEdit,
}: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState(transcript);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraft(transcript);
    setEditing(false);
    setError(null);
    setSavedMessage(null);
  }, [transcript]);

  const dirty = editing && draft !== transcript;

  async function saveTranscript() {
    const trimmed = draft.trim();
    if (!trimmed) {
      setError('Transcript cannot be empty.');
      return;
    }
    setError(null);
    setSavedMessage(null);
    setSaving(true);
    const supabase = createBrowserSupabaseClient();
    const { error: upErr } = await supabase
      .from('sermons')
      .update({ transcript: trimmed, transcript_status: 'completed' })
      .eq('id', sermonId);
    setSaving(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    setEditing(false);
    setSavedMessage(`Saved (${trimmed.length.toLocaleString()} characters).`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={`/sermons/${sermonId}`} className="admin-hint font-medium hover:text-admin-accent">
          ← Back to sermon
        </Link>
        <div className="mt-4">
          <h1 className="admin-heading">Source transcript</h1>
          <p className="admin-body mt-2">{sermonTitle}</p>
          {pastorLine ? <p className="admin-hint mt-1">{pastorLine}</p> : null}
        </div>
      </div>

      <div className="admin-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-admin-muted">
            {transcript.length.toLocaleString()} characters · used for AI devotional generation
          </p>
          {canEdit && !editing ? (
            <button
              type="button"
              onClick={() => {
                setDraft(transcript);
                setEditing(true);
                setError(null);
                setSavedMessage(null);
              }}
              className="text-[13px] font-medium text-sky-400 hover:text-sky-300"
            >
              Edit transcript
            </button>
          ) : null}
          {canEdit && editing ? (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveTranscript()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setDraft(transcript);
                  setEditing(false);
                  setError(null);
                }}
                className="rounded-lg border border-admin-strong px-4 py-2 text-[13px] text-admin-muted hover:bg-admin-surface disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          ) : null}
        </div>

        {dirty ? (
          <UnsavedWorkBanner>
            You have unsaved transcript edits. Save before leaving this page.
          </UnsavedWorkBanner>
        ) : null}

        {editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={24}
            spellCheck
            className="w-full resize-y rounded-lg border border-[#38bdf8]/40 bg-[#05070a] px-4 py-3 text-[14px] leading-relaxed text-admin-fg outline-none focus:ring-2 focus:ring-sky-400/40"
          />
        ) : (
          <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-admin bg-[#05070a]/60 p-4">
            <p className="admin-body whitespace-pre-wrap">{transcript}</p>
          </div>
        )}

        {savedMessage ? (
          <p className="text-[13px] text-emerald-400" role="status">
            {savedMessage}
          </p>
        ) : null}
        {error ? (
          <p className="text-[13px] text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {canEdit ? (
        <details className="admin-card p-4">
          <summary className="cursor-pointer text-[13px] font-medium text-admin-fg-strong">
            Replace sermon source
          </summary>
          <p className="admin-hint mt-2 text-[13px]">
            Upload a new file only if you need to re-transcribe. This will queue another transcription
            job and replace the current transcript when finished.
          </p>
          <SermonTranscriptUpload sermonId={sermonId} />
        </details>
      ) : null}
    </div>
  );
}

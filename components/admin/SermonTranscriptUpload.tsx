'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { TranscriptionJobPoller } from '@/components/admin/TranscriptionJobPoller';
import { TranscribeProgressPanel } from '@/components/admin/TranscribeProgressPanel';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { localizeApiError } from '@/lib/i18n/api-errors';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { TranscribePhase } from '@/lib/transcribe-progress-estimate';

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'upload';
}

type Props = {
  sermonId: string;
};

export function SermonTranscriptUpload({ sermonId }: Props) {
  const router = useRouter();
  const { t } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [queuedJobId, setQueuedJobId] = useState<string | null>(null);
  const [mediaProgress, setMediaProgress] = useState<{
    phase: TranscribePhase;
    phaseStartedAt: number;
    bytes: number;
  } | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError(null);
    setDone(null);
    setQueuedJobId(null);
    setBusy(true);
    setMediaProgress(null);

    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError(t('ns.err.signedOut'));
      setBusy(false);
      return;
    }

    try {
      if (file.type.startsWith('text/') || file.name.toLowerCase().endsWith('.txt')) {
        const text = await file.text();
        const trimmed = text.trim();
        if (!trimmed) {
          setError(t('tx.err.fileEmpty'));
          return;
        }
        const { error: upErr } = await supabase
          .from('sermons')
          .update({ transcript: trimmed, transcript_status: 'completed' })
          .eq('id', sermonId);
        if (upErr) {
          setError(upErr.message);
          return;
        }
        setDone(t('tx.savedText', { n: trimmed.length.toLocaleString() }));
        router.refresh();
        return;
      }

      setMediaProgress({
        phase: 'upload',
        phaseStartedAt: Date.now(),
        bytes: file.size,
      });

      const path = `${user.id}/${sermonId}/${Date.now()}-${safeFileName(file.name)}`;
      const { error: upStorage } = await supabase.storage.from('sermon-media').upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });
      if (upStorage) {
        setError(upStorage.message);
        return;
      }

      setMediaProgress({
        phase: 'transcribe',
        phaseStartedAt: Date.now(),
        bytes: file.size,
      });

      const res = await fetch('/api/transcription/jobs', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sermonId, sourceType: 'storage', storagePath: path }),
      });
      const json = (await res.json()) as { error?: string; jobId?: string };
      if (!res.ok || !json.jobId) {
        setError(json.error ? localizeApiError(json.error) : t('ns.err.queue'));
        return;
      }

      setQueuedJobId(json.jobId);
      setDone(t('tx.queued'));
    } catch {
      setError(t('common.error'));
    } finally {
      setMediaProgress(null);
      setBusy(false);
    }
  }

  async function savePastedText() {
    const trimmed = pasteText.trim();
    if (!trimmed) {
      setError(t('tx.err.pasteOrUpload'));
      return;
    }
    setError(null);
    setDone(null);
    setBusy(true);
    const supabase = createBrowserSupabaseClient();
    const { error: upErr } = await supabase
      .from('sermons')
      .update({ transcript: trimmed, transcript_status: 'completed', status: 'processing' })
      .eq('id', sermonId);
    setBusy(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    setPasteText('');
    setDone(t('tx.savedText', { n: trimmed.length.toLocaleString() }));
    router.refresh();
  }

  return (
    <div className="admin-card mt-4 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[14px] font-semibold text-[var(--admin-fg-strong)]">
            {t('tx.uploadTitle')}
          </p>
          <p className="admin-hint mt-1 text-[13px] leading-relaxed max-w-xl">
            {t('tx.uploadHint')} {t('tx.lengthHint')}
          </p>
        </div>
        <label className="shrink-0 inline-block">
          <input
            type="file"
            accept="audio/*,video/*,.txt,text/plain"
            className="hidden"
            disabled={busy}
            onChange={(ev) => void onPick(ev)}
          />
          <span className="cursor-pointer inline-flex items-center rounded-lg border border-[var(--admin-border-strong)] bg-[var(--admin-card-bg)] px-4 py-2 text-[13px] font-medium text-[var(--admin-fg)] shadow-sm hover:bg-[var(--admin-nav-hover-bg)] hover:text-[var(--admin-accent)] disabled:opacity-50 transition-colors">
            {busy ? t('tx.working') : t('ns.fileChoose')}
          </span>
        </label>
      </div>
      <div className="mt-4">
        <label htmlFor="fallback-paste" className="admin-label">
          {t('tx.pasteTitle')}
        </label>
        <textarea
          id="fallback-paste"
          rows={6}
          disabled={busy}
          placeholder={t('ns.textPlaceholder')}
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          className="admin-input mt-1 resize-y leading-relaxed"
        />
        <button
          type="button"
          disabled={busy || !pasteText.trim()}
          onClick={() => void savePastedText()}
          className="admin-btn-secondary mt-2 text-[13px]"
        >
          {t('tx.savePasted')}
        </button>
      </div>
      {mediaProgress && busy ? (
        <div className="mt-4">
          <TranscribeProgressPanel
            phase={mediaProgress.phase}
            phaseStartedAt={mediaProgress.phaseStartedAt}
            fileBytes={mediaProgress.bytes}
          />
        </div>
      ) : null}
      {queuedJobId ? (
        <div className="mt-4">
          <TranscriptionJobPoller
            jobId={queuedJobId}
            onComplete={() => {
              setDone(t('tx.savedDone'));
              router.refresh();
            }}
          />
        </div>
      ) : null}
      {error ? (
        <p className="mt-2 text-[13px] text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {done ? (
        <p className="mt-2 text-[13px] text-emerald-700 dark:text-emerald-400" role="status">
          {done}
        </p>
      ) : null}
    </div>
  );
}

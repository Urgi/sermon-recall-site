'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { SermonDatePicker } from '@/components/admin/SermonDatePicker';
import { TranscribeProgressPanel } from '@/components/admin/TranscribeProgressPanel';
import type { TranscribePhase } from '@/lib/transcribe-progress-estimate';

type Props = {
  churchId: string;
};

type InputKind = 'text' | 'file';

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'upload';
}

export function NewSermonForm({ churchId }: Props) {
  const router = useRouter();
  const [inputKind, setInputKind] = useState<InputKind>('text');
  const [title, setTitle] = useState('');
  const [pastorName, setPastorName] = useState('');
  const [sermonDate, setSermonDate] = useState('');
  const [scriptOrNotes, setScriptOrNotes] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [mediaProgress, setMediaProgress] = useState<{
    phase: TranscribePhase;
    phaseStartedAt: number;
    bytes: number;
  } | null>(null);

  function onModeChange(next: InputKind) {
    setInputKind(next);
    setError(null);
    setMediaProgress(null);
    if (next === 'text') setMediaFile(null);
    if (next === 'file') setScriptOrNotes('');
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const t = title.trim();
    if (!t) {
      setError('Title is required.');
      return;
    }

    const supabase = createBrowserSupabaseClient();
    setPending(true);

    try {
      if (inputKind === 'text') {
        const notes = scriptOrNotes.trim();
        if (!notes) {
          setError('Paste sermon text, or switch to “Audio / video / .txt file”.');
          return;
        }

        const { data, error: insertError } = await supabase
          .from('sermons')
          .insert({
            church_id: churchId,
            title: t,
            pastor_name: pastorName.trim() || null,
            sermon_date: sermonDate || null,
            transcript: notes,
            status: 'processing' as const,
          })
          .select('id')
          .single();

        if (insertError) {
          setError(insertError.message);
          return;
        }
        if (data?.id) {
          router.push(`/sermons/${data.id}`);
          router.refresh();
        }
        return;
      }

      if (!mediaFile) {
        setError('Choose a .txt, audio, or video file.');
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('Not signed in.');
        return;
      }

      const isPlainText =
        mediaFile.type.startsWith('text/') || mediaFile.name.toLowerCase().endsWith('.txt');

      if (isPlainText) {
        const text = (await mediaFile.text()).trim();
        if (!text) {
          setError('That text file was empty.');
          return;
        }

        const { data, error: insertError } = await supabase
          .from('sermons')
          .insert({
            church_id: churchId,
            title: t,
            pastor_name: pastorName.trim() || null,
            sermon_date: sermonDate || null,
            transcript: text,
            status: 'processing' as const,
          })
          .select('id')
          .single();

        if (insertError) {
          setError(insertError.message);
          return;
        }
        if (data?.id) {
          router.push(`/sermons/${data.id}`);
          router.refresh();
        }
        return;
      }

      const { data: created, error: insertError } = await supabase
        .from('sermons')
        .insert({
          church_id: churchId,
          title: t,
          pastor_name: pastorName.trim() || null,
          sermon_date: sermonDate || null,
          transcript: null,
          status: 'processing' as const,
        })
        .select('id')
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }
      const sermonId = created?.id;
      if (!sermonId) {
        setError('Could not create sermon.');
        return;
      }

      setMediaProgress({
        phase: 'upload',
        phaseStartedAt: Date.now(),
        bytes: mediaFile.size,
      });

      const path = `${user.id}/${sermonId}/${Date.now()}-${safeFileName(mediaFile.name)}`;
      const { error: upStorage } = await supabase.storage.from('sermon-media').upload(path, mediaFile, {
        upsert: false,
        contentType: mediaFile.type || undefined,
      });
      if (upStorage) {
        setError(upStorage.message);
        return;
      }

      setMediaProgress({
        phase: 'transcribe',
        phaseStartedAt: Date.now(),
        bytes: mediaFile.size,
      });

      const res = await fetch('/api/transcribe-sermon', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sermonId, storagePath: path }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? 'Transcription failed.');
        return;
      }

      router.push(`/sermons/${sermonId}`);
      router.refresh();
    } catch {
      setError('Something went wrong.');
    } finally {
      setMediaProgress(null);
      setPending(false);
    }
  }

  function fileNeedsTranscribe(f: File) {
    if (f.name.toLowerCase().endsWith('.txt')) return false;
    if (f.type.startsWith('text/')) return false;
    return true;
  }

  const submitLabel =
    pending && inputKind === 'file' && mediaFile && fileNeedsTranscribe(mediaFile)
      ? 'Transcribing…'
      : pending
        ? 'Saving…'
        : 'Add sermon';

  return (
    <form onSubmit={(ev) => void onSubmit(ev)} className="mx-auto max-w-3xl space-y-5">
      <div>
        <label htmlFor="sermon-title" className="admin-label">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="sermon-title"
          name="title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="admin-input mt-1"
        />
      </div>
      <div>
        <label htmlFor="sermon-pastor" className="admin-label">
          Pastor name
        </label>
        <input
          id="sermon-pastor"
          name="pastorName"
          type="text"
          value={pastorName}
          onChange={(e) => setPastorName(e.target.value)}
          className="admin-input mt-1"
        />
      </div>
      <div>
        <span className="admin-label">Sermon date</span>
        <p className="admin-hint mt-1">Optional — pick from the calendar or leave unset.</p>
        <SermonDatePicker id="sermon-date" value={sermonDate} onChange={setSermonDate} />
      </div>

      <fieldset className="admin-fieldset space-y-3">
        <legend>Sermon source</legend>
        <p className="admin-hint leading-relaxed">
          Choose one: paste text, or upload a file. Audio and video are transcribed on the server (
          <code className="text-[11px] text-violet-600 dark:text-violet-200">OPENAI_API_KEY</code>
          ).
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <label className="admin-radio-choice">
            <input
              type="radio"
              name="inputKind"
              checked={inputKind === 'text'}
              onChange={() => onModeChange('text')}
              className="text-sky-500"
            />
            Paste text
          </label>
          <label className="admin-radio-choice">
            <input
              type="radio"
              name="inputKind"
              checked={inputKind === 'file'}
              onChange={() => onModeChange('file')}
              className="text-sky-500"
            />
            Audio / video / .txt file
          </label>
        </div>

        {inputKind === 'text' ? (
          <div>
            <label htmlFor="sermon-script" className="admin-label">
              Sermon script or notes <span className="text-red-500">*</span>
            </label>
            <textarea
              id="sermon-script"
              name="scriptOrNotes"
              rows={12}
              required
              placeholder="Paste manuscript, outline, or bullets…"
              value={scriptOrNotes}
              onChange={(e) => setScriptOrNotes(e.target.value)}
              className="admin-input mt-2 resize-y leading-relaxed placeholder:text-[var(--admin-dim)]"
            />
          </div>
        ) : (
          <div>
            <span className="admin-label">
              File <span className="text-red-500">*</span>
            </span>
            <p className="admin-hint mt-1">
              .txt is saved directly; audio or video is uploaded then transcribed (may take a minute).
            </p>
            <label className="mt-2 inline-block">
              <input
                type="file"
                accept="audio/*,video/*,.txt,text/plain"
                className="hidden"
                disabled={pending}
                onChange={(ev) => {
                  const f = ev.target.files?.[0] ?? null;
                  setMediaFile(f);
                  setError(null);
                  ev.target.value = '';
                }}
              />
              <span className="admin-btn-secondary inline-block cursor-pointer text-[13px]">
                Choose file
              </span>
            </label>
            {mediaFile ? (
              <p className="admin-hint mt-2">
                Selected:{' '}
                <span className="font-medium text-[var(--admin-fg-strong)]">{mediaFile.name}</span>
              </p>
            ) : null}
          </div>
        )}
      </fieldset>

      {error ? (
        <p className="text-[13px] text-red-500 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {mediaProgress && pending ? (
        <TranscribeProgressPanel
          phase={mediaProgress.phase}
          phaseStartedAt={mediaProgress.phaseStartedAt}
          fileBytes={mediaProgress.bytes}
        />
      ) : null}
      <div className="flex flex-wrap gap-3 pt-2">
        <button type="submit" disabled={pending} className="admin-btn-primary text-[15px]">
          {submitLabel}
        </button>
        <button type="button" onClick={() => router.back()} className="admin-btn-secondary text-[15px]">
          Cancel
        </button>
      </div>
    </form>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { SermonDatePicker } from '@/components/admin/SermonDatePicker';

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

  function onModeChange(next: InputKind) {
    setInputKind(next);
    setError(null);
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

      const path = `${user.id}/${sermonId}/${Date.now()}-${safeFileName(mediaFile.name)}`;
      const { error: upStorage } = await supabase.storage.from('sermon-media').upload(path, mediaFile, {
        upsert: false,
        contentType: mediaFile.type || undefined,
      });
      if (upStorage) {
        setError(upStorage.message);
        return;
      }

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
        <label htmlFor="sermon-title" className="block text-[13px] font-medium text-[#94a3b8]">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          id="sermon-title"
          name="title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[rgba(56,189,248,0.2)] bg-[#05070a] px-3 py-2 text-[15px] text-white outline-none ring-sky-400/40 focus:border-[#38bdf8] focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="sermon-pastor" className="block text-[13px] font-medium text-[#94a3b8]">
          Pastor name
        </label>
        <input
          id="sermon-pastor"
          name="pastorName"
          type="text"
          value={pastorName}
          onChange={(e) => setPastorName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[rgba(56,189,248,0.2)] bg-[#05070a] px-3 py-2 text-[15px] text-white outline-none ring-sky-400/40 focus:border-[#38bdf8] focus:ring-2"
        />
      </div>
      <div>
        <span className="block text-[13px] font-medium text-[#94a3b8]">Sermon date</span>
        <p className="mt-1 text-[12px] text-[#64748b]">Optional — pick from the calendar or leave unset.</p>
        <SermonDatePicker id="sermon-date" value={sermonDate} onChange={setSermonDate} />
      </div>

      <fieldset className="space-y-3 rounded-xl border border-[rgba(56,189,248,0.2)] bg-[#05070a]/40 p-4">
        <legend className="px-1 text-[13px] font-semibold text-[#94a3b8]">Sermon source</legend>
        <p className="text-[12px] leading-relaxed text-[#64748b]">
          Choose one: paste text, or upload a file. Audio and video are transcribed on the server (
          <code className="text-[11px] text-violet-200">OPENAI_API_KEY</code>).
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[rgba(56,189,248,0.25)] bg-[#0a0f18] px-3 py-2 text-[14px] text-[#e2e8f0] has-[:checked]:border-sky-400/60 has-[:checked]:bg-sky-950/40">
            <input
              type="radio"
              name="inputKind"
              checked={inputKind === 'text'}
              onChange={() => onModeChange('text')}
              className="border-[#64748b] text-sky-500"
            />
            Paste text
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[rgba(56,189,248,0.25)] bg-[#0a0f18] px-3 py-2 text-[14px] text-[#e2e8f0] has-[:checked]:border-sky-400/60 has-[:checked]:bg-sky-950/40">
            <input
              type="radio"
              name="inputKind"
              checked={inputKind === 'file'}
              onChange={() => onModeChange('file')}
              className="border-[#64748b] text-sky-500"
            />
            Audio / video / .txt file
          </label>
        </div>

        {inputKind === 'text' ? (
          <div>
            <label htmlFor="sermon-script" className="block text-[13px] font-medium text-[#94a3b8]">
              Sermon script or notes <span className="text-red-400">*</span>
            </label>
            <textarea
              id="sermon-script"
              name="scriptOrNotes"
              rows={12}
              required
              placeholder="Paste manuscript, outline, or bullets…"
              value={scriptOrNotes}
              onChange={(e) => setScriptOrNotes(e.target.value)}
              className="mt-2 w-full resize-y rounded-lg border border-[rgba(56,189,248,0.2)] bg-[#05070a] px-3 py-2 font-[system-ui] text-[15px] leading-relaxed text-white outline-none ring-sky-400/40 placeholder:text-[#475569] focus:border-[#38bdf8] focus:ring-2"
            />
          </div>
        ) : (
          <div>
            <span className="block text-[13px] font-medium text-[#94a3b8]">
              File <span className="text-red-400">*</span>
            </span>
            <p className="mt-1 text-[12px] text-[#64748b]">
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
              <span className="cursor-pointer rounded-lg border border-[rgba(56,189,248,0.35)] bg-[#0a0f18] px-4 py-2 text-[13px] font-medium text-sky-200 hover:bg-[#0f172a]">
                Choose file
              </span>
            </label>
            {mediaFile ? (
              <p className="mt-2 text-[13px] text-[#94a3b8]">
                Selected: <span className="font-medium text-[#e2e8f0]">{mediaFile.name}</span>
              </p>
            ) : null}
          </div>
        )}
      </fieldset>

      {error ? (
        <p className="text-[13px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[#0ea5e9] px-4 py-2.5 text-[15px] font-semibold text-white hover:bg-[#0284c7] disabled:opacity-60"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-[rgba(56,189,248,0.25)] px-4 py-2.5 text-[15px] text-[#94a3b8] hover:bg-[#0a0f18]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'upload';
}

type Props = {
  sermonId: string;
};

export function SermonTranscriptUpload({ sermonId }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError(null);
    setDone(null);
    setBusy(true);

    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      setError('Not signed in.');
      return;
    }

    try {
      if (file.type.startsWith('text/') || file.name.toLowerCase().endsWith('.txt')) {
        const text = await file.text();
        const trimmed = text.trim();
        if (!trimmed) {
          setError('Text file was empty.');
          setBusy(false);
          return;
        }
        const { error: upErr } = await supabase
          .from('sermons')
          .update({ transcript: trimmed })
          .eq('id', sermonId);
        if (upErr) {
          setError(upErr.message);
          setBusy(false);
          return;
        }
        setDone(`Saved text (${trimmed.length.toLocaleString()} characters).`);
        router.refresh();
        setBusy(false);
        return;
      }

      const path = `${user.id}/${sermonId}/${Date.now()}-${safeFileName(file.name)}`;
      const { error: upStorage } = await supabase.storage.from('sermon-media').upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });
      if (upStorage) {
        setError(upStorage.message);
        setBusy(false);
        return;
      }

      const res = await fetch('/api/transcribe-sermon', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sermonId, storagePath: path }),
      });
      const json = (await res.json()) as { error?: string; charCount?: number };
      if (!res.ok) {
        setError(json.error ?? 'Transcription failed.');
        setBusy(false);
        return;
      }

      setDone(
        `Transcript saved (${typeof json.charCount === 'number' ? json.charCount.toLocaleString() : '?'} characters).`,
      );
      router.refresh();
    } catch {
      setError('Something went wrong.');
    }
    setBusy(false);
  }

  return (
    <div className="mt-4 rounded-xl border border-[rgba(56,189,248,0.15)] bg-[#020617]/60 p-4">
      <p className="text-[13px] font-semibold text-sky-200">Add sermon from file</p>
      <p className="mt-1 text-[12px] leading-relaxed text-[#94a3b8]">
        Upload a <strong className="font-medium text-[#cbd5e1]">.txt</strong> (saved directly) or{' '}
        <strong className="font-medium text-[#cbd5e1]">audio / video</strong> (sent through OpenAI
        transcription — set <code className="text-[11px] text-violet-200">OPENAI_API_KEY</code> on
        the server). Max about 50 MB. Then run Gemini generation as usual.
      </p>
      <label className="mt-3 inline-block">
        <input
          type="file"
          accept="audio/*,video/*,.txt,text/plain"
          className="hidden"
          disabled={busy}
          onChange={(ev) => void onPick(ev)}
        />
        <span className="cursor-pointer rounded-lg border border-[rgba(56,189,248,0.35)] bg-[#0a0f18] px-4 py-2 text-[13px] font-medium text-sky-200 hover:bg-[#0f172a] disabled:opacity-50">
          {busy ? 'Working…' : 'Choose file'}
        </span>
      </label>
      {error ? (
        <p className="mt-2 text-[13px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {done ? (
        <p className="mt-2 text-[13px] text-emerald-400" role="status">
          {done}
        </p>
      ) : null}
    </div>
  );
}

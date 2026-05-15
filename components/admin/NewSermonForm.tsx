'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { SermonDatePicker } from '@/components/admin/SermonDatePicker';

type Props = {
  churchId: string;
};

export function NewSermonForm({ churchId }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [pastorName, setPastorName] = useState('');
  const [sermonDate, setSermonDate] = useState('');
  const [scriptOrNotes, setScriptOrNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const notes = scriptOrNotes.trim();
    setPending(true);
    const supabase = createBrowserSupabaseClient();
    const row = {
      church_id: churchId,
      title: title.trim(),
      pastor_name: pastorName.trim() || null,
      sermon_date: sermonDate || null,
      transcript: notes.length > 0 ? notes : null,
      status: 'processing' as const,
    };
    const { data, error: insertError } = await supabase
      .from('sermons')
      .insert(row)
      .select('id')
      .single();
    setPending(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    if (data?.id) {
      router.push(`/sermons/${data.id}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-4">
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
      <div>
        <label htmlFor="sermon-script" className="block text-[13px] font-medium text-[#94a3b8]">
          Sermon script or notes <span className="text-[#64748b]">(optional)</span>
        </label>
        <p className="mt-1 text-[12px] leading-relaxed text-[#64748b]">
          Paste text here, or leave blank and upload audio/video on the next screen after you save.
          Needs <code className="rounded bg-black/40 px-1 text-[11px] text-violet-200">OPENAI_API_KEY</code>{' '}
          on the server for transcription.
        </p>
        <textarea
          id="sermon-script"
          name="scriptOrNotes"
          rows={14}
          placeholder="Paste sermon content here… (optional if you’ll upload media next)"
          value={scriptOrNotes}
          onChange={(e) => setScriptOrNotes(e.target.value)}
          className="mt-2 w-full resize-y rounded-lg border border-[rgba(56,189,248,0.2)] bg-[#05070a] px-3 py-2 font-[system-ui] text-[15px] leading-relaxed text-white outline-none ring-sky-400/40 placeholder:text-[#475569] focus:border-[#38bdf8] focus:ring-2"
        />
      </div>
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
          {pending ? 'Saving…' : 'Add sermon'}
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

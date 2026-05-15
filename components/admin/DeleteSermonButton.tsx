'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

type Props = {
  sermonId: string;
  sermonTitle: string;
};

export function DeleteSermonButton({ sermonId, sermonTitle }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    const raw = sermonTitle.trim() || 'this sermon';
    const label = raw.length > 80 ? `${raw.slice(0, 77)}…` : raw;
    if (
      !window.confirm(
        `Delete “${label}”? This removes the sermon and all devotionals for it (and related member progress). This cannot be undone.`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    const supabase = createBrowserSupabaseClient();
    const { error: delErr } = await supabase.from('sermons').delete().eq('id', sermonId);
    setBusy(false);

    if (delErr) {
      setError(delErr.message);
      return;
    }

    router.push('/sermons');
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void onDelete()}
        className="rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-1.5 text-[12px] font-semibold text-red-200 hover:bg-red-950/50 disabled:opacity-50"
      >
        {busy ? 'Deleting…' : 'Delete sermon'}
      </button>
      {error ? (
        <p className="max-w-[240px] text-right text-[11px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

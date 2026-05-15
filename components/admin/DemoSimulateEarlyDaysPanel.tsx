'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

type Props = {
  sermonId: string;
};

/**
 * Pastor/admin demo: mark Days 1–5 complete for a member so Day 6 is next (e.g. Friday after Saturday sermon).
 */
export function DemoSimulateEarlyDaysPanel({ sermonId }: Props) {
  const router = useRouter();
  const [memberUserId, setMemberUserId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    setMessage(null);
    const id = memberUserId.trim();
    if (!id) {
      setError('Paste the member’s user id (UUID from Supabase → users).');
      return;
    }
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(id)) {
      setError('That does not look like a UUID.');
      return;
    }

    setBusy(true);
    const sb = createBrowserSupabaseClient();
    const { data, error: rpcErr } = await sb.rpc('simulate_early_days_progress_for_member', {
      p_member_user_id: id,
      p_sermon_id: sermonId,
      p_through_day: 5,
    });
    setBusy(false);

    if (rpcErr) {
      setError(rpcErr.message);
      return;
    }

    const j = data as { ok?: boolean; completed_through_day?: number } | null;
    setMessage(
      j?.ok
        ? `Marked Days 1–${j.completed_through_day ?? 5} complete for that member. Day 6 is next — refresh the app.`
        : 'Done.',
    );
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-dashed border-amber-500/35 bg-amber-950/15 p-5">
      <h3 className="text-[14px] font-semibold text-amber-100">Demo: simulate earlier days done</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-amber-100/75">
        Marks Days <strong className="font-medium text-amber-50">1–5</strong> complete for a church member on{' '}
        <strong className="font-medium text-amber-50">this sermon</strong>. Clears completion on Days 6+ so Day 6 shows as next —
        matches a &quot;Friday with Saturday sermon&quot; reminder scenario after real calendar unlock.
      </p>
      <p className="mt-2 text-[12px] leading-relaxed text-amber-100/55">
        Find UUID in Supabase → Table Editor → <code className="text-amber-200/90">users</code> → filter by church → copy{' '}
        <code className="text-amber-200/90">id</code>.
      </p>
      <label className="mt-4 block text-[12px] font-medium text-amber-100/85">
        Member user id (UUID)
      </label>
      <input
        type="text"
        value={memberUserId}
        onChange={(e) => setMemberUserId(e.target.value)}
        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        autoComplete="off"
        spellCheck={false}
        className="mt-1 w-full max-w-xl rounded-lg border border-amber-500/25 bg-[#05070a] px-3 py-2 font-mono text-[13px] text-amber-50 outline-none placeholder:text-amber-100/25 focus:border-amber-400/50"
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => void run()}
        className="mt-4 rounded-lg border border-amber-400/40 bg-amber-950/40 px-4 py-2 text-[13px] font-semibold text-amber-100 hover:bg-amber-950/70 disabled:opacity-50"
      >
        {busy ? 'Applying…' : 'Mark Days 1–5 complete'}
      </button>
      {error ? (
        <p className="mt-3 text-[13px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 text-[13px] text-emerald-400/95" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}

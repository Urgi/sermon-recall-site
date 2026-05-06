'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function ClaimLeadPastorButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setError(null);
    setPending(true);
    const supabase = createBrowserSupabaseClient();
    const { error: rpcError } = await supabase.rpc('claim_lead_pastor_if_vacant');
    setPending(false);
    if (rpcError) {
      if (rpcError.message.includes('pastor_already_exists')) {
        setError(
          'This church already has a lead pastor or admin. Ask them to promote your account in Supabase, or use another workspace.',
        );
      } else if (rpcError.message.includes('no_church')) {
        setError('Join or create a church first.');
      } else {
        setError(rpcError.message);
      }
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void claim()}
        disabled={pending}
        className="rounded-lg bg-[#0ea5e9] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0284c7] disabled:opacity-60"
      >
        {pending ? 'Updating…' : 'Become lead pastor for this church'}
      </button>
      <p className="text-[12px] leading-relaxed text-sky-100/75">
        Only use this if you are the primary pastor and no one else has claimed admin yet (typical
        for a new church or demo).
      </p>
      {error ? (
        <p className="text-[13px] text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

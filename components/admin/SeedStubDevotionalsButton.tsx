'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

type Props = {
  sermonId: string;
};

export function SeedStubDevotionalsButton({ sermonId }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    setPending(true);
    const supabase = createBrowserSupabaseClient();
    const { error: rpcError } = await supabase.rpc('seed_stub_devotionals', {
      p_sermon_id: sermonId,
    });
    setPending(false);
    if (rpcError) {
      if (rpcError.message.includes('devotionals_already_exist')) {
        setError('This sermon already has devotionals.');
      } else if (rpcError.message.includes('forbidden')) {
        setError('Pastor access required.');
      } else if (rpcError.message.includes('sermon_not_found')) {
        setError('Sermon not found for your church.');
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
        onClick={() => void run()}
        disabled={pending}
        className="rounded-lg bg-[#0ea5e9] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0284c7] disabled:opacity-60"
      >
        {pending ? 'Creating…' : 'Fill six-day placeholders (demo)'}
      </button>
      <p className="max-w-xl text-[12px] leading-relaxed text-[#64748b]">
        Inserts starter content for days 1–6 and marks the sermon as ready so the app shows the
        journey. Swap later for real AI-generated devotionals.
      </p>
      {error ? (
        <p className="text-[13px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    setPending(false);
    router.refresh();
    router.push('/login');
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={pending}
      className={
        className ??
        'rounded-md px-2 py-2 text-left text-[14px] text-[#94a3b8] hover:bg-[#0a0f18] hover:text-[#38bdf8] disabled:opacity-50'
      }
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}

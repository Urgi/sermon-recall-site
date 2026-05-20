'use client';

import { Suspense } from 'react';

import { AuthCallbackClient } from './AuthCallbackClient';

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--admin-page-bg,#05070a)] px-6">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400/30 border-t-sky-400"
            aria-hidden
          />
          <p className="text-center text-[15px] text-[#94a3b8]">Finishing sign-in…</p>
        </div>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}

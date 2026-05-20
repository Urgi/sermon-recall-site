'use client';

import { Suspense } from 'react';

import { AppToastHost } from '@/components/AppToastHost';

export function AuthLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <AppToastHost />
      </Suspense>
      {children}
    </>
  );
}

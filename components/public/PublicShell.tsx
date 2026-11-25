'use client';

import type { ReactNode } from 'react';

import { LanguageProvider } from '@/components/i18n/LanguageProvider';
import { PublicSiteFooter } from '@/components/public/PublicSiteFooter';
import { PublicSiteHeader } from '@/components/public/PublicSiteHeader';

/**
 * Frame for the public marketing pages. Pages render in English on the server (static and
 * indexable); in the browser they switch to the language chosen earlier on this device, or else
 * the browser's own language. The header's EN/ES/FR switch changes it and remembers the choice.
 */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider detectBrowserLanguage>
      <div className="flex min-h-screen flex-col bg-[#05070a] text-[#e2e8f0]">
        <PublicSiteHeader />
        {children}
        <PublicSiteFooter />
      </div>
    </LanguageProvider>
  );
}

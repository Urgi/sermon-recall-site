import { cookies } from 'next/headers';

import { AuthLanguageSwitch } from '@/components/auth/AuthLanguageSwitch';
import { LanguageProvider } from '@/components/i18n/LanguageProvider';
import { LANGUAGE_COOKIE } from '@/lib/i18n/languages';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const remembered = cookies().get(LANGUAGE_COOKIE)?.value ?? null;
  return (
    <LanguageProvider initialLanguage={remembered} detectBrowserLanguage>
      <div
        data-theme="dark"
        className="relative flex min-h-screen flex-col items-center justify-center bg-[#05070a] px-4 py-8 sm:py-12"
      >
        <div className="flex w-full max-w-md flex-col sm:contents">
          <AuthLanguageSwitch />
          {children}
        </div>
      </div>
    </LanguageProvider>
  );
}

'use client';

import { useLanguage } from '@/components/i18n/LanguageProvider';
import { APP_LANGUAGES } from '@/lib/i18n/languages';

/**
 * Language picker for signed-out screens (sign in, register, invite, public pages).
 * Remembered on this device. `className` replaces the default auth-card placement.
 */
export function AuthLanguageSwitch({ className }: { className?: string } = {}) {
  const { t, language, setLanguage } = useLanguage();
  return (
    <div
      role="group"
      aria-label={t('auth.language')}
      className={`flex items-center gap-1 rounded-full border border-[rgba(56,189,248,0.2)] p-1 ${
        className ?? 'mb-4 self-end sm:absolute sm:right-6 sm:top-6 sm:mb-0 sm:self-auto'
      }`}
    >
      {APP_LANGUAGES.map((opt) => {
        const active = opt.value === language;
        return (
          <button
            key={opt.value}
            type="button"
            lang={opt.value}
            aria-pressed={active}
            title={opt.nativeLabel}
            onClick={() => setLanguage(opt.value)}
            className={`min-h-9 min-w-10 rounded-full px-3 text-[13px] font-semibold uppercase transition-colors duration-fast ${
              active ? 'bg-[#0379bd] text-white' : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            {opt.value}
          </button>
        );
      })}
    </div>
  );
}

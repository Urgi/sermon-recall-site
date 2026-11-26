'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useLanguage } from '@/components/i18n/LanguageProvider';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function SignOutButton({
  className,
  variant = 'text',
}: {
  className?: string;
  variant?: 'text' | 'icon';
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    setPending(false);
    router.refresh();
    router.push('/login');
  }

  if (variant === 'icon') {
    const label = pending ? t('common.signingOut') : t('common.signOut');
    return (
      <button
        type="button"
        onClick={() => void signOut()}
        disabled={pending}
        aria-label={label}
        title={label}
        className={className ?? 'admin-icon-btn shrink-0 disabled:opacity-50'}
      >
        <LogOut aria-hidden className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={pending}
      className={
        className ??
        'w-full rounded-md px-2 py-2 text-left text-[14px] text-admin-muted transition-colors duration-fast hover:bg-admin-nav-hover hover:text-admin-accent disabled:opacity-50'
      }
    >
      {pending ? t('common.signingOut') : t('common.signOut')}
    </button>
  );
}

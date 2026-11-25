import type { Metadata } from 'next';

import { localizedTitle } from '@/lib/i18n/server';
import { AdminChromeCopy } from '@/components/admin/AdminChromeCopy';
import { VerifyEmailForm } from '@/components/admin/VerifyEmailForm';
import { SermonRecallLogo } from '@/components/branding/SermonRecallLogo';
import { authCardClass } from '@/components/auth/authFormStyles';

export function generateMetadata(): Metadata {
  return { title: localizedTitle('login.confirmAccount') };
}

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const email = typeof searchParams.email === 'string' ? searchParams.email : '';
  const linkRejected = searchParams.error === 'use_code';

  return (
    <div className={authCardClass}>
      <div className="mb-6 flex justify-center">
        <SermonRecallLogo variant="hero" className="h-24 w-auto" priority />
      </div>
      <h1 className="text-xl font-bold text-white">
        <AdminChromeCopy k="login.confirmAccount" />
      </h1>
      <VerifyEmailForm initialEmail={email} linkRejected={linkRejected} />
    </div>
  );
}

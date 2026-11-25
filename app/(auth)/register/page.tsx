import type { Metadata } from 'next';

import { localizedTitle } from '@/lib/i18n/server';
import Link from 'next/link';

import { AdminChromeCopy } from '@/components/admin/AdminChromeCopy';
import { RegisterForm } from '@/components/admin/RegisterForm';
import { SermonRecallLogo } from '@/components/branding/SermonRecallLogo';
import { authCardClass } from '@/components/auth/authFormStyles';

export function generateMetadata(): Metadata {
  return { title: localizedTitle('reg.title') };
}

export default function RegisterPage() {
  return (
    <div className={authCardClass}>
      <div className="mb-6 flex justify-center">
        <SermonRecallLogo variant="hero" className="h-24 w-auto" priority />
      </div>
      <h1 className="text-xl font-bold text-white">
        <AdminChromeCopy k="reg.title" />
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[#94a3b8]">
        <AdminChromeCopy k="reg.intro" />
      </p>
      <p className="mt-3 rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-[13px] leading-relaxed text-sky-100">
        <AdminChromeCopy k="reg.codeNote" />
      </p>
      <RegisterForm />
      <p className="mt-6 text-center text-[13px] text-[#94a3b8]">
        <AdminChromeCopy k="reg.haveAccount" />{' '}
        <Link href="/login" className="inline-flex min-h-8 items-center text-[#38bdf8] hover:underline">
          <AdminChromeCopy k="auth.signIn" />
        </Link>
      </p>
    </div>
  );
}

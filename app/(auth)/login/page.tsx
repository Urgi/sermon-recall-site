import type { Metadata } from 'next';
import Link from 'next/link';

import { LoginForm } from '@/components/admin/LoginForm';
import { SermonRecallLogo } from '@/components/branding/SermonRecallLogo';
import { authCardClass } from '@/components/auth/authFormStyles';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const next =
    typeof searchParams.next === 'string' && searchParams.next.startsWith('/')
      ? searchParams.next
      : '/dashboard';
  const initialEmail = typeof searchParams.email === 'string' ? searchParams.email : '';
  const linkRejected = searchParams.error === 'use_code';

  return (
    <div className={authCardClass}>
      <div className="mb-6 flex justify-center">
        <SermonRecallLogo variant="hero" className="h-24 w-auto" priority />
      </div>
      <h1 className="text-xl font-bold text-white">Pastor sign in</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[#94a3b8]">
        Sign in with a one-time code sent to your church admin email — no password needed.
      </p>
      <LoginForm nextPath={next} initialEmail={initialEmail} linkRejected={linkRejected} />
      <div className="mt-6 space-y-1 border-t border-[rgba(56,189,248,0.12)] pt-4 text-center text-[13px] text-[#94a3b8]">
        <p>
          No account?{' '}
          <Link href="/register" className="inline-flex min-h-8 items-center text-[#38bdf8] hover:underline">
            Create a church account
          </Link>
        </p>
        <p>
          Just registered?{' '}
          <Link href="/verify-email" className="inline-flex min-h-8 items-center text-[#38bdf8] hover:underline">
            Confirm your new account
          </Link>
        </p>
      </div>
    </div>
  );
}

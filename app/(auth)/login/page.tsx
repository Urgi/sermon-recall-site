import Link from 'next/link';

import { LoginForm } from '@/components/admin/LoginForm';
import { SermonRecallLogo } from '@/components/branding/SermonRecallLogo';

export default function LoginPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const next =
    typeof searchParams.next === 'string' && searchParams.next.startsWith('/')
      ? searchParams.next
      : '/dashboard';

  return (
    <div className="w-full max-w-md rounded-xl border border-[rgba(56,189,248,0.15)] bg-[#0a0f18] p-8 shadow-lg shadow-black/20">
      <div className="mb-6 flex justify-center">
        <SermonRecallLogo variant="hero" className="h-24 w-auto" priority />
      </div>
      <h1 className="text-xl font-bold text-white">Pastor sign in</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[#94a3b8]">
        Sign in with the email and password for your church admin account.
      </p>
      <LoginForm nextPath={next} />
      <p className="mt-6 text-center text-[13px] text-[#64748b]">
        No account?{' '}
        <Link href="/register" className="text-[#38bdf8] hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}

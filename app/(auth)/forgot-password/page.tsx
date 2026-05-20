import Link from 'next/link';

import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { SermonRecallLogo } from '@/components/branding/SermonRecallLogo';

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-md rounded-xl border border-[rgba(56,189,248,0.15)] bg-[#0a0f18] p-8 shadow-lg shadow-black/20">
      <div className="mb-6 flex justify-center">
        <SermonRecallLogo variant="hero" className="h-24 w-auto" priority />
      </div>
      <h1 className="text-xl font-bold text-white">Reset your password</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[#94a3b8]">
        Enter the email for your account. We will send a link to choose a new password.
      </p>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-[13px] text-[#64748b]">
        Remember your password?{' '}
        <Link href="/login" className="text-[#38bdf8] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

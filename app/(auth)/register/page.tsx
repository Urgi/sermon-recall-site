import type { Metadata } from 'next';
import Link from 'next/link';

import { RegisterForm } from '@/components/admin/RegisterForm';
import { SermonRecallLogo } from '@/components/branding/SermonRecallLogo';
import { authCardClass } from '@/components/auth/authFormStyles';

export const metadata: Metadata = { title: 'Create admin account' };

export default function RegisterPage() {
  return (
    <div className={authCardClass}>
      <div className="mb-6 flex justify-center">
        <SermonRecallLogo variant="hero" className="h-24 w-auto" priority />
      </div>
      <h1 className="text-xl font-bold text-white">Create admin account</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[#94a3b8]">
        After signing in, lead pastors can <span className="text-[#e2e8f0]">create a new church</span>{' '}
        on the dashboard (you become pastor automatically). Staff can instead join an existing church
        with its code, same as in the mobile app.
      </p>
      <p className="mt-3 rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-[13px] leading-relaxed text-sky-100">
        We email you a one-time code to finish creating your account. Enter it on the next screen.
      </p>
      <RegisterForm />
      <p className="mt-6 text-center text-[13px] text-[#94a3b8]">
        Already have an account?{' '}
        <Link href="/login" className="inline-flex min-h-8 items-center text-[#38bdf8] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

import Link from 'next/link';

import { RegisterForm } from '@/components/admin/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md rounded-xl border border-[rgba(56,189,248,0.15)] bg-[#0a0f18] p-8 shadow-lg shadow-black/20">
      <h1 className="text-xl font-bold text-white">Create admin account</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[#94a3b8]">
        After signing in, lead pastors can <span className="text-[#e2e8f0]">create a new church</span>{' '}
        on the dashboard (you become pastor automatically). Staff can instead join an existing church
        with its code, same as in the mobile app.
      </p>
      <RegisterForm />
      <p className="mt-6 text-center text-[13px] text-[#64748b]">
        Already have an account?{' '}
        <Link href="/login" className="text-[#38bdf8] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { SermonRecallLogo } from '@/components/branding/SermonRecallLogo';

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-md rounded-xl border border-[rgba(56,189,248,0.15)] bg-[#0a0f18] p-8 shadow-lg shadow-black/20">
      <div className="mb-6 flex justify-center">
        <SermonRecallLogo variant="hero" className="h-24 w-auto" priority />
      </div>
      <h1 className="text-xl font-bold text-white">Choose a new password</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[#94a3b8]">
        Use at least 8 characters. You will sign in again after updating.
      </p>
      <ResetPasswordForm />
    </div>
  );
}

import { VerifyEmailForm } from '@/components/admin/VerifyEmailForm';
import { SermonRecallLogo } from '@/components/branding/SermonRecallLogo';

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const email = typeof searchParams.email === 'string' ? searchParams.email : '';
  const linkRejected = searchParams.error === 'use_code';

  return (
    <div className="w-full max-w-md rounded-xl border border-[rgba(56,189,248,0.15)] bg-[#0a0f18] p-8 shadow-lg shadow-black/20">
      <div className="mb-6 flex justify-center">
        <SermonRecallLogo variant="hero" className="h-24 w-auto" priority />
      </div>
      <h1 className="text-xl font-bold text-white">Confirm your email</h1>
      <VerifyEmailForm initialEmail={email} linkRejected={linkRejected} />
    </div>
  );
}

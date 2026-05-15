import Link from 'next/link';

import { canManageSermons } from '@/lib/auth/profile';
import { requireAdminSession } from '@/lib/auth/server';
import { NewSermonForm } from '@/components/admin/NewSermonForm';

export default async function NewSermonPage() {
  const { profile } = await requireAdminSession();
  const canPublish = canManageSermons(profile.role);

  if (!profile.church_id) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-2xl font-bold text-white">Add sermon</h1>
        <p className="text-[15px] text-[#94a3b8]">
          Create or join a church from the dashboard before adding sermons.
        </p>
        <Link href="/dashboard" className="text-[#38bdf8] hover:underline">
          Go to dashboard
        </Link>
      </div>
    );
  }

  if (!canPublish) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-2xl font-bold text-white">Add sermon</h1>
        <p className="text-[15px] leading-relaxed text-[#94a3b8]">
          Your account needs the pastor or admin role to create sermons. See the dashboard for
          instructions.
        </p>
        <Link href="/dashboard" className="text-[#38bdf8] hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link
          href="/sermons"
          className="text-[13px] font-medium text-[#64748b] hover:text-[#38bdf8]"
        >
          ← Sermons
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Add sermon</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[#94a3b8]">
          Choose <span className="text-[#e2e8f0]">paste text</span> or{' '}
          <span className="text-[#e2e8f0]">audio / video / .txt</span>, then add sermon in one step.
          Status starts as <span className="text-[#e2e8f0]">processing</span> until you mark it ready.
        </p>
      </div>
      <NewSermonForm churchId={profile.church_id} />
    </div>
  );
}

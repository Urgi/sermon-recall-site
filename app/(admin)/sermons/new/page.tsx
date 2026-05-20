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
        <h1 className="admin-heading">Add sermon</h1>
        <p className="admin-body">
          Create or join a church from the dashboard before adding sermons.
        </p>
        <Link href="/dashboard" className="admin-link">
          Go to dashboard
        </Link>
      </div>
    );
  }

  if (!canPublish) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="admin-heading">Add sermon</h1>
        <p className="admin-body">
          Your account needs the pastor or admin role to create sermons. See the dashboard for
          instructions.
        </p>
        <Link href="/dashboard" className="admin-link">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link href="/sermons" className="admin-link-back">
          ← Sermons
        </Link>
        <h1 className="admin-heading mt-4">Add sermon</h1>
        <p className="admin-body mt-2">
          Choose <span className="font-medium text-[var(--admin-fg-strong)]">paste text</span> or{' '}
          <span className="font-medium text-[var(--admin-fg-strong)]">audio / video / .txt</span>,
          then add sermon in one step. Status starts as{' '}
          <span className="font-medium text-[var(--admin-fg-strong)]">processing</span> until you mark
          it ready.
        </p>
      </div>
      <NewSermonForm churchId={profile.church_id} />
    </div>
  );
}

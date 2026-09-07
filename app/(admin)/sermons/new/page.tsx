import { canManageSermons } from '@/lib/auth/profile';
import { getChurchSettingsForProfile, requireAdminSession } from '@/lib/auth/server';
import { NewSermonForm } from '@/components/admin/NewSermonForm';
import Link from 'next/link';

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

  const church = await getChurchSettingsForProfile(profile.church_id);

  return (
    <NewSermonForm
      churchId={profile.church_id}
      sermonLanguage={church?.sermon_language}
      defaultPastorName={church?.pastor_name}
    />
  );
}

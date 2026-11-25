import type { Metadata } from 'next';

import { localizedTitle } from '@/lib/i18n/server';
import { canManageSermons } from '@/lib/auth/profile';
import { getChurchSettingsForProfile, requireAdminSession } from '@/lib/auth/server';
import { AdminChromeCopy } from '@/components/admin/AdminChromeCopy';
import { NewSermonForm } from '@/components/admin/NewSermonForm';
import Link from 'next/link';

export function generateMetadata(): Metadata {
  return { title: localizedTitle('ns.pageTitleNew') };
}

export default async function NewSermonPage() {
  const { profile } = await requireAdminSession();
  const canPublish = canManageSermons(profile.role);

  if (!profile.church_id) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="admin-heading">
          <AdminChromeCopy k="ns.addSermon" />
        </h1>
        <p className="admin-body">
          <AdminChromeCopy k="ns.noChurch" />
        </p>
        <Link href="/dashboard" className="admin-link">
          <AdminChromeCopy k="common.goDashboard" />
        </Link>
      </div>
    );
  }

  if (!canPublish) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="admin-heading">
          <AdminChromeCopy k="ns.addSermon" />
        </h1>
        <p className="admin-body">
          <AdminChromeCopy k="ns.noPermission" />
        </p>
        <Link href="/dashboard" className="admin-link">
          <AdminChromeCopy k="common.backDashboard" />
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

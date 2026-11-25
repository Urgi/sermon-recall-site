import type { Metadata } from 'next';

import { localizedTitle } from '@/lib/i18n/server';
import { AdminChromeCopy } from '@/components/admin/AdminChromeCopy';
import Link from 'next/link';
import { Suspense } from 'react';

import { AdminPageFallback } from '@/components/admin/AdminPageFallback';
import { canAccessTeamNav } from '@/lib/auth/profile';
import { getChurchForProfile, requireApprovedStaffSession } from '@/lib/auth/server';
import { TeamDashboard } from '@/components/admin/TeamDashboard';

export function generateMetadata(): Metadata {
  return { title: localizedTitle('nav.team') };
}

export default function TeamPage() {
  return (
    <Suspense fallback={<AdminPageFallback />}>
      <TeamPageBody />
    </Suspense>
  );
}

async function TeamPageBody() {
  const ctx = await requireApprovedStaffSession();
  const church = await getChurchForProfile(ctx.profile.church_id);

  const canView = canAccessTeamNav(ctx.profile, ctx.staffRole, {
    ownerUserId: church?.owner_user_id,
    userId: ctx.user.id,
  });

  if (!ctx.profile.church_id) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="admin-heading">
          <AdminChromeCopy k="team.title" />
        </h1>
        <p className="admin-body mt-4">
          <AdminChromeCopy k="team.noChurch" />
        </p>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="admin-heading">
          <AdminChromeCopy k="team.title" />
        </h1>
        <p className="admin-body mt-4">
          <AdminChromeCopy k="team.noAccess" />
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="admin-heading">
          <AdminChromeCopy k="team.title" />
        </h1>
        <p className="admin-body mt-2 max-w-2xl">
          <AdminChromeCopy k="team.intro" />{' '}
          <Link href="/members" className="text-admin-link hover:underline">
            <AdminChromeCopy k="members.title" />
          </Link>
          .
        </p>
      </header>
      <TeamDashboard />
    </div>
  );
}

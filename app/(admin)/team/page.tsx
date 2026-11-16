import { AdminChromeCopy } from '@/components/admin/AdminChromeCopy';
import Link from 'next/link';
import { Suspense } from 'react';

import { AdminPageFallback } from '@/components/admin/AdminPageFallback';
import { canAccessTeamNav } from '@/lib/auth/profile';
import { getChurchForProfile, requireApprovedStaffSession } from '@/lib/auth/server';
import { TeamDashboard } from '@/components/admin/TeamDashboard';

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
        <h1 className="admin-heading">Team</h1>
        <p className="admin-body mt-4">Create or join a church to manage your team.</p>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="admin-heading">Team</h1>
        <p className="admin-body mt-4">
          Your role does not include access to team management. Contact your church owner or admin
          pastor if you need access changes.
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

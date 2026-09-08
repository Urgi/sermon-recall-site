import Link from 'next/link';
import { Suspense } from 'react';

import { AdminPageFallback } from '@/components/admin/AdminPageFallback';
import { DashboardShareCard } from '@/components/admin/DashboardShareCard';
import { canAccessTeamNav } from '@/lib/auth/profile';
import { getChurchForProfile, requireAdminSession } from '@/lib/auth/server';
import { buildMemberJoinUrl } from '@/lib/church/member-join';

export default function MembersPage() {
  return (
    <Suspense fallback={<AdminPageFallback />}>
      <MembersPageBody />
    </Suspense>
  );
}

async function MembersPageBody() {
  const { user, profile, staffRole } = await requireAdminSession();
  const church = await getChurchForProfile(profile.church_id);
  const canViewTeam = canAccessTeamNav(profile, staffRole, {
    ownerUserId: church?.owner_user_id,
    userId: user.id,
  });

  if (!profile.church_id || !church) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="admin-heading">Members</h1>
        <p className="admin-body">Create or join a church from the dashboard first.</p>
        <Link href="/dashboard" className="text-admin-link hover:underline">
          Go to dashboard
        </Link>
      </div>
    );
  }

  const joinUrl = church.church_code ? buildMemberJoinUrl(church.church_code) : null;
  const qrDataUrl = church.church_code ? '/api/church/qr-image' : null;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="text-[13px] font-medium text-admin-dim hover:text-[#38bdf8]"
        >
          ← Dashboard
        </Link>
        <h1 className="admin-heading mt-4">Members</h1>
        <p className="admin-body mt-2">
          This page is only for the congregation — people who use the phone app. Scanning the QR or
          entering the church code does <strong>not</strong> give anyone pastor or admin access.
        </p>
      </div>

      <section id="invite">
        {joinUrl && qrDataUrl ? (
          <DashboardShareCard
            churchName={church.name}
            churchCode={church.church_code}
            joinUrl={joinUrl}
            qrDataUrl={qrDataUrl}
            heading="Invite members"
            hint="They install the app, sign in, and enter this code or scan the QR. They see devotionals — not this admin portal."
            size="lg"
          />
        ) : (
          <div className="admin-card p-6">
            <h2 className="admin-section-title">Invite members</h2>
            <p className="admin-body mt-2">This church does not have a church code yet.</p>
          </div>
        )}
      </section>

      <section className="admin-card p-6">
        <h2 className="admin-section-title">Staff and elevated roles</h2>
        <p className="admin-body mt-2">
          To let someone help run sermons, review devotionals, or send notifications, invite them by
          email on Team and pick a role (for example associate pastor). They sign in here on the web
          — not through this QR.
        </p>
        {canViewTeam ? (
          <Link href="/team" className="admin-btn-primary mt-4 inline-flex">
            Invite staff on Team
          </Link>
        ) : (
          <p className="admin-hint mt-3">
            Ask a church owner or admin pastor to send a Team invite if someone needs elevated access.
          </p>
        )}
      </section>
    </div>
  );
}

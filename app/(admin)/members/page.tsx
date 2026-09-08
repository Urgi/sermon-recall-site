import Link from 'next/link';
import { Suspense } from 'react';

import { AdminPageFallback } from '@/components/admin/AdminPageFallback';
import { DashboardShareCard } from '@/components/admin/DashboardShareCard';
import { MembersRoster } from '@/components/admin/MembersRoster';
import { parseChurchMembers, type ChurchMemberRow } from '@/lib/admin/church-members';
import { getChurchForProfile, requireAdminSession } from '@/lib/auth/server';
import { buildMemberJoinUrl } from '@/lib/church/member-join';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default function MembersPage() {
  return (
    <Suspense fallback={<AdminPageFallback />}>
      <MembersPageBody />
    </Suspense>
  );
}

async function MembersPageBody() {
  const { profile } = await requireAdminSession();
  const church = await getChurchForProfile(profile.church_id);
  const supabase = createServerSupabaseClient();

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

  const { data: membersData, error: membersError } = await supabase.rpc('pastor_list_church_members');
  const parsed = membersError ? null : parseChurchMembers(membersData);
  const members: ChurchMemberRow[] = parsed?.members ?? [];
  const memberCount = parsed?.member_count ?? members.length;

  const joinUrl = church.church_code ? buildMemberJoinUrl(church.church_code) : null;
  const qrDataUrl = church.church_code ? '/api/church/qr-image' : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="admin-heading">Members</h1>
          <p className="admin-body mt-2">
            People who joined this church in the app.
            {memberCount > 0 ? (
              <>
                {' '}
                <span className="tabular-nums font-semibold text-[var(--admin-fg-strong)]">
                  {memberCount}
                </span>{' '}
                {memberCount === 1 ? 'member' : 'members'}.
              </>
            ) : null}
          </p>
        </div>
      </div>

      {membersError ? (
        <div className="admin-card p-6">
          <p className="text-[14px] text-red-500" role="alert">
            Could not load members. Refresh the page, or try again in a moment.
          </p>
        </div>
      ) : (
        <MembersRoster members={members} />
      )}

      <section id="invite">
        {joinUrl && qrDataUrl ? (
          <DashboardShareCard
            churchName={church.name}
            churchCode={church.church_code}
            joinUrl={joinUrl}
            qrDataUrl={qrDataUrl}
            heading="Invite members"
            hint="They install the app, sign in, and enter this code or scan the QR."
            size="lg"
          />
        ) : (
          <div className="admin-card p-6">
            <h2 className="admin-section-title">Invite members</h2>
            <p className="admin-body mt-2">This church does not have a church code yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}

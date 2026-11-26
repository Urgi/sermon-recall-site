import type { Metadata } from 'next';

import { localizedTitle } from '@/lib/i18n/server';
import { AdminChromeCopy } from '@/components/admin/AdminChromeCopy';
import Link from 'next/link';
import { Suspense } from 'react';

import { AdminPageFallback } from '@/components/admin/AdminPageFallback';
import { MembersInviteAccordion } from '@/components/admin/MembersInviteAccordion';
import { MembersRoster } from '@/components/admin/MembersRoster';
import { parseChurchMembers, type ChurchMemberRow } from '@/lib/admin/church-members';
import { staffHasPermission } from '@/lib/auth/profile';
import { getChurchForProfile, requireAdminSession } from '@/lib/auth/server';
import { buildMemberJoinUrl } from '@/lib/church/member-join';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export function generateMetadata(): Metadata {
  return { title: localizedTitle('nav.members') };
}

export default function MembersPage() {
  return (
    <Suspense fallback={<AdminPageFallback />}>
      <MembersPageBody />
    </Suspense>
  );
}

async function MembersPageBody() {
  const { profile, staffRole } = await requireAdminSession();
  const canRemove = staffHasPermission(staffRole, profile, 'can_manage_team');
  const church = await getChurchForProfile(profile.church_id);
  const supabase = createServerSupabaseClient();

  if (!profile.church_id || !church) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="admin-heading">
          <AdminChromeCopy k="members.title" />
        </h1>
        <p className="admin-body">
          <AdminChromeCopy k="members.createFirst" />
        </p>
        <Link href="/dashboard" className="text-admin-link hover:underline">
          <AdminChromeCopy k="common.goDashboard" />
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
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="admin-heading">
            <AdminChromeCopy k="members.title" />
          </h1>
          <p className="admin-body mt-2">
            <AdminChromeCopy k="members.intro" />
            {memberCount > 0 ? (
              <>
                {' '}
                <span className="tabular-nums font-semibold text-[var(--admin-fg-strong)]">
                  {memberCount}
                </span>{' '}
                <AdminChromeCopy k={memberCount === 1 ? 'members.count1' : 'members.countN'} />.
              </>
            ) : null}
          </p>
        </div>
      </div>

      {membersError ? (
        <div className="admin-card p-6">
          <p className="text-[14px] text-red-500" role="alert">
            <AdminChromeCopy k="members.loadError" />
          </p>
        </div>
      ) : (
        <MembersRoster members={members} canRemove={canRemove} />
      )}

      <MembersInviteAccordion
        churchName={church.name}
        churchCode={church.church_code ?? null}
        joinUrl={joinUrl}
        qrDataUrl={qrDataUrl}
      />
    </div>
  );
}

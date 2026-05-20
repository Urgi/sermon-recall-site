import Link from 'next/link';

import { canManageSermonsWithStaff } from '@/lib/auth/profile';
import { getChurchForProfile, requireAdminSession } from '@/lib/auth/server';
import { parsePastorEngagement } from '@/lib/engagement/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ChurchQrCard } from '@/components/admin/ChurchQrCard';
import { CreateChurchForm } from '@/components/admin/CreateChurchForm';
import { JoinChurchForm } from '@/components/admin/JoinChurchForm';
import { buildMemberJoinUrl } from '@/lib/church/member-join';
import { qrPngDataUrl } from '@/lib/church/qr';
import { PastorBroadcastForm } from '@/components/admin/PastorBroadcastForm';
import { ScheduledBroadcastPanel } from '@/components/admin/ScheduledBroadcastPanel';
import { PastorEngagementSection } from '@/components/admin/PastorEngagementSection';

type Props = { searchParams: { staff?: string; error?: string } };

export default async function DashboardPage({ searchParams }: Props) {
  const { profile, staffRole, membership, isApprovedStaff } = await requireAdminSession();
  const church = await getChurchForProfile(profile.church_id);
  const supabase = createServerSupabaseClient();

  let sermonCount = 0;
  if (profile.church_id) {
    const { count } = await supabase
      .from('sermons')
      .select('id', { count: 'exact', head: true })
      .eq('church_id', profile.church_id);
    sermonCount = count ?? 0;
  }

  const canPublish = isApprovedStaff && canManageSermonsWithStaff(profile, staffRole);

  let engagementParsed = null as ReturnType<typeof parsePastorEngagement>;
  if (profile.church_id && canPublish) {
    const { data: engagementRaw, error: engagementErr } = await supabase.rpc(
      'pastor_church_engagement',
      { p_church_id: profile.church_id },
    );
    if (!engagementErr) {
      engagementParsed = parsePastorEngagement(engagementRaw);
    }
  }

  const churchMemberPositive =
    engagementParsed != null ? engagementParsed.member_count > 0 : Boolean(profile.church_id);

  let memberJoinUrl: string | null = null;
  let memberQrDataUrl: string | null = null;
  if (church?.church_code) {
    memberJoinUrl = buildMemberJoinUrl(church.church_code);
    memberQrDataUrl = await qrPngDataUrl(memberJoinUrl);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="admin-heading">Dashboard</h1>
        <p className="admin-body mt-2">
          Upload sermons, track processing, and review devotionals for your congregation.
        </p>
      </div>

      {searchParams.staff === 'pending' || (membership?.status === 'pending' && profile.church_id) ? (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
          <h2 className="admin-section-title text-amber-900 dark:text-amber-100">
            Awaiting admin approval
          </h2>
          <p className="admin-body mt-2 text-amber-900/90 dark:text-amber-100/85">
            Your invite was accepted. A church owner or admin must approve your access before you can
            manage sermons or send notifications.
          </p>
        </section>
      ) : null}

      {searchParams.error === 'forbidden' ? (
        <p className="text-[13px] text-red-500" role="alert">
          You don&apos;t have permission for that action.
        </p>
      ) : null}

      {!profile.church_id ? (
        <div className="space-y-6">
          <section className="admin-card p-6">
            <h2 className="admin-section-title">Start your church</h2>
            <p className="admin-body mt-2">
              Create your church workspace. You become the owner and can invite team members from the
              Team page.
            </p>
            <div className="mt-4">
              <CreateChurchForm />
            </div>
          </section>
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
            <h2 className="admin-section-title text-amber-900 dark:text-amber-100">
              Have an invite?
            </h2>
            <p className="admin-body mt-2 text-amber-900/90 dark:text-amber-100/85">
              Open the link from your invitation email after signing in. Staff should not use the
              member church code here.
            </p>
          </section>
        </div>
      ) : (
        <>
          <section className="admin-card p-6">
            <h2 className="admin-hint text-sm font-semibold uppercase tracking-wide">Your church</h2>
            <p className="admin-section-title mt-1">{church?.name ?? '—'}</p>
            <p className="admin-hint mt-1 font-mono">Member code: {church?.church_code ?? '—'}</p>
          </section>
          {church?.church_code && memberJoinUrl && memberQrDataUrl ? (
            <section className="admin-card p-6">
              <h2 className="admin-section-title">Member join QR</h2>
              <p className="admin-body mt-2">
                Share this QR in bulletins, slides, or email so members can join your church in the
                app.
              </p>
              <ChurchQrCard
                churchName={church.name}
                churchCode={church.church_code}
                joinUrl={memberJoinUrl}
                qrDataUrl={memberQrDataUrl}
              />
            </section>
          ) : null}
        </>
      )}

      {profile.church_id && canPublish ? (
        <PastorEngagementSection engagement={engagementParsed} churchHasMembers={churchMemberPositive} />
      ) : null}

      {profile.church_id && canPublish ? (
        <section className="admin-card p-6">
          <h2 className="admin-section-title">Notify your church</h2>
          <p className="admin-body mt-2">
            Send a one-time push or schedule for later. Members also receive automatic devotional
            reminders for published sermon cycles.
          </p>
          <div className="mt-4 space-y-8">
            <PastorBroadcastForm />
            <div className="border-t border-admin pt-8">
              <ScheduledBroadcastPanel />
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="admin-card p-5">
          <p className="admin-hint text-[13px] font-medium uppercase tracking-wide">Sermons</p>
          <p className="mt-2 text-3xl font-bold text-admin-fg-strong">{sermonCount}</p>
          <Link href="/sermons" className="mt-3 inline-block text-[14px] font-medium text-admin-link hover:underline">
            View all
          </Link>
        </div>
        <div className="admin-card p-5">
          <p className="admin-hint text-[13px] font-medium uppercase tracking-wide">Quick action</p>
          {canPublish && profile.church_id ? (
            <Link href="/sermons/new" className="admin-btn-primary mt-3 inline-block">
              Add sermon
            </Link>
          ) : (
            <p className="admin-hint mt-3">
              {profile.church_id
                ? 'Approved staff access required to add sermons.'
                : 'Create or join a church to continue.'}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

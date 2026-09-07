import {
  canManageSermonsWithStaff,
  staffHasPermission,
} from '@/lib/auth/profile';
import { getChurchForProfile, requireAdminSession } from '@/lib/auth/server';
import { ClaimLeadPastorButton } from '@/components/admin/ClaimLeadPastorButton';
import {
  DashboardOverview,
  type DashboardSermonRow,
} from '@/components/admin/DashboardOverview';
import { parsePastorEngagement, parsePastorMidweekNudge } from '@/lib/engagement/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { CreateChurchForm } from '@/components/admin/CreateChurchForm';
import { buildMemberJoinUrl } from '@/lib/church/member-join';
import { qrPngDataUrl } from '@/lib/church/qr';
import type { SermonWorkflowStatus } from '@/lib/admin/workflow-status';
import { pastorLifecycle } from '@/lib/admin/workflow-status';

type Props = { searchParams: { staff?: string; error?: string } };

export default async function DashboardPage({ searchParams }: Props) {
  const { user, profile, staffRole, membership, isApprovedStaff } = await requireAdminSession();
  const church = await getChurchForProfile(profile.church_id);
  const supabase = createServerSupabaseClient();

  const canPublish = isApprovedStaff && canManageSermonsWithStaff(profile, staffRole);
  const canSendNotifications =
    isApprovedStaff && staffHasPermission(staffRole, profile, 'can_send_notifications');

  let engagementParsed = null as ReturnType<typeof parsePastorEngagement>;
  let midweekNudge = null as ReturnType<typeof parsePastorMidweekNudge>;
  if (profile.church_id && canPublish) {
    const { data: engagementRaw, error: engagementErr } = await supabase.rpc(
      'pastor_church_engagement',
      { p_church_id: profile.church_id },
    );
    if (!engagementErr) {
      engagementParsed = parsePastorEngagement(engagementRaw);
    }
  }
  if (profile.church_id && (canPublish || canSendNotifications)) {
    const { data: nudgeRaw, error: nudgeErr } = await supabase.rpc('pastor_midweek_nudge_status', {
      p_church_id: profile.church_id,
    });
    if (!nudgeErr) {
      midweekNudge = parsePastorMidweekNudge(nudgeRaw);
    }
  }

  let recentSermons: DashboardSermonRow[] = [];
  if (profile.church_id) {
    const { data: sermons } = await supabase
      .from('sermons')
      .select('id, title, sermon_date, workflow_status, status, transcript_status')
      .eq('church_id', profile.church_id)
      .order('created_at', { ascending: false })
      .limit(5);
    recentSermons = (sermons ?? []).map((s) => ({
      id: s.id as string,
      title: s.title as string,
      sermon_date: (s.sermon_date as string | null) ?? null,
      lifecycle: pastorLifecycle({
        workflow: ((s.workflow_status as SermonWorkflowStatus) ?? 'draft') as SermonWorkflowStatus,
        ingestStatus: (s.status as string | null) ?? null,
        transcriptStatus: (s.transcript_status as string | null) ?? null,
      }),
    }));
  }

  let memberJoinUrl: string | null = null;
  let memberQrDataUrl: string | null = null;
  if (church?.church_code) {
    memberJoinUrl = buildMemberJoinUrl(church.church_code);
    memberQrDataUrl = await qrPngDataUrl(memberJoinUrl);
  }

  const greetingName = profile.full_name?.trim() || user.email?.split('@')[0] || null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
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
        <div className="mx-auto max-w-lg space-y-6">
          <div>
            <h1 className="admin-heading">Welcome</h1>
            <p className="admin-body mt-2">Create a church workspace to get started.</p>
          </div>
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
          {church && !church.owner_user_id && canPublish ? (
            <section className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-6">
              <h2 className="admin-section-title text-sky-900 dark:text-sky-100">
                Claim lead pastor
              </h2>
              <p className="admin-body mt-2 text-sky-900/90 dark:text-sky-100/85">
                This church has no lead pastor yet. Claim the role to unlock the Team page and invite
                staff.
              </p>
              <div className="mt-4">
                <ClaimLeadPastorButton />
              </div>
            </section>
          ) : null}
          <DashboardOverview
            greetingName={greetingName}
            churchName={church?.name ?? 'Your church'}
            churchCode={church?.church_code ?? null}
            joinUrl={memberJoinUrl}
            qrDataUrl={memberQrDataUrl}
            canPublish={canPublish}
            canNotify={canSendNotifications}
            engagement={engagementParsed}
            midweekNudge={midweekNudge}
            recentSermons={recentSermons}
          />
        </>
      )}
    </div>
  );
}

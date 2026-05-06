import Link from 'next/link';

import { canManageSermons } from '@/lib/auth/profile';
import { getChurchForProfile, requireAdminSession } from '@/lib/auth/server';
import { parsePastorEngagement } from '@/lib/engagement/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ClaimLeadPastorButton } from '@/components/admin/ClaimLeadPastorButton';
import { CreateChurchForm } from '@/components/admin/CreateChurchForm';
import { JoinChurchForm } from '@/components/admin/JoinChurchForm';
import { PastorEngagementSection } from '@/components/admin/PastorEngagementSection';

export default async function DashboardPage() {
  const { profile } = await requireAdminSession();
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

  const canPublish = canManageSermons(profile.role);

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

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[#94a3b8]">
          Upload sermons, track processing, and review devotionals for your congregation.
        </p>
      </div>

      {!profile.church_id ? (
        <div className="space-y-6">
          <section className="rounded-xl border border-[rgba(56,189,248,0.2)] bg-[#0a0f18] p-6">
            <h2 className="text-lg font-semibold text-white">Start your church</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[#94a3b8]">
              If you are planting or leading a congregation here, create the church first. You become
              the lead pastor for this workspace and get a shareable code so members can join in the
              app.
            </p>
            <div className="mt-4">
              <CreateChurchForm />
            </div>
          </section>
          <section className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-6">
            <h2 className="text-lg font-semibold text-amber-100">Join an existing church</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-amber-100/80">
              Use this if your church already uses Sermon Recall — for example an associate pastor or
              staff member entering the same code members use. Your role stays{' '}
              <code className="text-amber-200">member</code> until an admin promotes you to pastor.
            </p>
            <div className="mt-4">
              <JoinChurchForm />
            </div>
          </section>
        </div>
      ) : (
        <section className="rounded-xl border border-[rgba(56,189,248,0.15)] bg-[#0a0f18] p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#64748b]">
            Your church
          </h2>
          <p className="mt-1 text-lg font-medium text-white">{church?.name ?? '—'}</p>
          <p className="mt-1 font-mono text-[13px] text-[#94a3b8]">
            Code: {church?.church_code ?? '—'}
          </p>
        </section>
      )}

      {profile.church_id && !canPublish ? (
        <section className="rounded-xl border border-sky-500/25 bg-sky-950/25 p-6">
          <h2 className="text-lg font-semibold text-sky-100">Pastor access</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-sky-100/85">
            You joined this church with a member account. To publish sermons you need the pastor
            role. If nobody else is set up as pastor yet, you can claim it below.
          </p>
          <div className="mt-4">
            <ClaimLeadPastorButton />
          </div>
          <details className="mt-6 border-t border-sky-500/20 pt-4 text-[13px] text-sky-100/70">
            <summary className="cursor-pointer select-none font-medium text-sky-200 hover:text-sky-100">
              Advanced: set role in Supabase SQL
            </summary>
            <p className="mt-2 leading-relaxed">
              Run in the SQL editor as a project admin if you prefer manual setup:{' '}
              <code className="break-all rounded bg-black/30 px-1.5 py-0.5 text-[12px] text-sky-200">
                update public.users set role = &apos;pastor&apos; where id = &apos;YOUR_USER_ID&apos;;
              </code>
            </p>
          </details>
        </section>
      ) : null}

      {profile.church_id && canPublish ? (
        <PastorEngagementSection engagement={engagementParsed} churchHasMembers={churchMemberPositive} />
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[rgba(56,189,248,0.12)] bg-[#0a0f18] p-5">
          <p className="text-[13px] font-medium uppercase tracking-wide text-[#64748b]">
            Sermons
          </p>
          <p className="mt-2 text-3xl font-bold text-white">{sermonCount}</p>
          <Link
            href="/sermons"
            className="mt-3 inline-block text-[14px] font-medium text-[#38bdf8] hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="rounded-xl border border-[rgba(56,189,248,0.12)] bg-[#0a0f18] p-5">
          <p className="text-[13px] font-medium uppercase tracking-wide text-[#64748b]">
            Quick action
          </p>
          {canPublish && profile.church_id ? (
            <Link
              href="/sermons/new"
              className="mt-3 inline-block rounded-lg bg-[#0ea5e9] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0284c7]"
            >
              Add sermon
            </Link>
          ) : (
            <p className="mt-3 text-[14px] text-[#64748b]">
              {profile.church_id
                ? 'Pastor role needed to add sermons.'
                : 'Create or join a church to continue.'}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

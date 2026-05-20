import { canAccessTeamNav } from '@/lib/auth/profile';
import { getChurchForProfile, requireApprovedStaffSession } from '@/lib/auth/server';
import { TeamDashboard } from '@/components/admin/TeamDashboard';

export default async function TeamPage() {
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
        <h1 className="admin-heading">Team</h1>
        <p className="admin-body mt-2 max-w-2xl">
          Manage who can access your church workspace. Invite staff by email, approve new members,
          and control what each role is allowed to do. All changes are enforced securely on the server.
        </p>
      </header>
      <TeamDashboard />
    </div>
  );
}

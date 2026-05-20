'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { TeamPermissionsMatrix } from '@/components/admin/TeamPermissionsMatrix';
import type { StaffRole } from '@/lib/auth/permissions';
import {
  assignableRolesFor,
  formatTeamDate,
  permissionSummary,
  ROLE_LABELS,
  statusLabel,
} from '@/lib/team/role-guide';
import type { TeamInviteRow, TeamMemberRow, TeamSnapshot } from '@/lib/team/types';

function displayName(row: { full_name: string | null; email: string | null }): string {
  return row.full_name?.trim() || row.email || 'Unknown';
}

function StatusPill({ status }: { status: string }) {
  const base = 'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide';
  if (status === 'active') {
    return <span className={`${base} bg-emerald-500/15 text-emerald-700 dark:text-emerald-300`}>Active</span>;
  }
  if (status === 'pending' || status === 'accepted_pending_approval') {
    return <span className={`${base} bg-amber-500/15 text-amber-800 dark:text-amber-200`}>{statusLabel(status)}</span>;
  }
  if (status === 'pending_invite' || status === 'pending') {
    return <span className={`${base} bg-sky-500/15 text-sky-800 dark:text-sky-300`}>Invite sent</span>;
  }
  return <span className={`${base} bg-admin-surface text-admin-muted`}>{statusLabel(status)}</span>;
}

export function TeamDashboard() {
  const router = useRouter();
  const [team, setTeam] = useState<TeamSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<StaffRole>('associate_pastor');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/team', { credentials: 'include' });
    const data = (await res.json()) as { error?: string; team?: TeamSnapshot };
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Could not load team.');
      setTeam(null);
      return;
    }
    setTeam(data.team ?? null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const callerRole = (team?.caller.role as StaffRole) ?? null;
  const assignable = useMemo(() => assignableRolesFor(callerRole), [callerRole]);

  const pendingInvites = useMemo(
    () => (team?.invites ?? []).filter((i) => i.status === 'pending'),
    [team],
  );
  const acceptedAwaitingApproval = useMemo(
    () => (team?.invites ?? []).filter((i) => i.status === 'accepted_pending_approval'),
    [team],
  );

  async function runAction(key: string, fn: () => Promise<void>) {
    setActionPending(key);
    setError(null);
    setSuccess(null);
    try {
      await fn();
      await load();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setActionPending(null);
    }
  }

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    await runAction('invite', async () => {
      const res = await fetch('/api/invites/create', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = (await res.json()) as { error?: string; warning?: string };
      if (!res.ok) throw new Error(data.error ?? 'Invite failed.');
      setSuccess(data.warning ?? `Invitation sent to ${inviteEmail.trim()}.`);
      setInviteEmail('');
      setShowInvite(false);
    });
  }

  if (loading) {
    return (
      <div className="admin-card flex items-center justify-center py-16">
        <p className="admin-hint">Loading team…</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="admin-card p-8 text-center">
        <p className="text-red-500" role="alert">{error ?? 'Unable to load team.'}</p>
      </div>
    );
  }

  const { caller, owner, active_members, pending_approvals } = team;
  const totalActive = (owner ? 1 : 0) + active_members.length;

  return (
    <div className="space-y-8">
      {(error || success) && (
        <div
          className={`rounded-lg border px-4 py-3 text-[13px] ${
            error
              ? 'border-red-500/30 bg-red-500/10 text-red-600'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
          }`}
          role={error ? 'alert' : 'status'}
        >
          {error ?? success}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active team" value={String(totalActive)} />
        <StatCard label="Pending approval" value={String(pending_approvals.length)} highlight={pending_approvals.length > 0} />
        <StatCard label="Invites outstanding" value={String(pendingInvites.length)} />
        <StatCard label="Your role" value={ROLE_LABELS[(caller.role as StaffRole) ?? 'viewer'] ?? '—'} />
      </div>

      {caller.can_invite && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="admin-hint">
            {caller.can_manage
              ? 'You can invite, approve, change roles, and remove team members.'
              : caller.can_approve
                ? 'You can approve pending requests.'
                : 'You can send invitations.'}
          </p>
          <button type="button" onClick={() => setShowInvite((v) => !v)} className="admin-btn-primary">
            {showInvite ? 'Close invite form' : 'Invite team member'}
          </button>
        </div>
      )}

      {showInvite && caller.can_invite && (
        <form onSubmit={onInvite} className="admin-card space-y-4 p-6">
          <h2 className="admin-section-title">Invite by email</h2>
          <p className="admin-hint">
            They receive a secure link valid for 7 days. After accepting, you must approve their access.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="team-invite-email" className="admin-label">Email address</label>
              <input
                id="team-invite-email"
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="admin-input mt-1"
                placeholder="name@church.org"
              />
            </div>
            <div>
              <label htmlFor="team-invite-role" className="admin-label">Role</label>
              <select
                id="team-invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as StaffRole)}
                className="admin-input mt-1"
              >
                {assignable.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" disabled={actionPending === 'invite'} className="admin-btn-primary">
            {actionPending === 'invite' ? 'Sending…' : 'Send invitation'}
          </button>
        </form>
      )}

      {owner && (
        <section className="admin-card overflow-hidden">
          <div className="border-b border-admin bg-admin-surface/50 px-6 py-3">
            <h2 className="admin-section-title text-sm">Church owner</h2>
          </div>
          <MemberTableRow
            member={owner as TeamMemberRow}
            caller={caller}
            assignable={assignable}
            actionPending={actionPending}
            onApprove={() => {}}
            onReject={() => {}}
            onChangeRole={() => {}}
            onRemove={() => {}}
            isOwner
          />
        </section>
      )}

      <section className="admin-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-admin px-6 py-4">
          <div>
            <h2 className="admin-section-title">Active team members</h2>
            <p className="admin-hint mt-0.5">Approved staff with access to church admin tools</p>
          </div>
        </div>
        {active_members.length === 0 ? (
          <p className="admin-body px-6 py-8 text-center">No other team members yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="border-b border-admin bg-admin-surface text-[11px] font-semibold uppercase tracking-wide text-admin-dim">
                <tr>
                  <th className="px-6 py-3">Person</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Permissions</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin">
                {active_members.map((m) => (
                  <MemberTableRow
                    key={m.membership_id ?? m.user_id}
                    member={m}
                    caller={caller}
                    assignable={assignable}
                    actionPending={actionPending}
                    onApprove={() => {}}
                    onReject={() => {}}
                    onChangeRole={(role) =>
                      runAction(`role-${m.membership_id}`, async () => {
                        const res = await fetch('/api/team/change-role', {
                          method: 'POST',
                          credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ membershipId: m.membership_id, role }),
                        });
                        const data = (await res.json()) as { error?: string };
                        if (!res.ok) throw new Error(data.error ?? 'Could not update role.');
                        setSuccess('Role updated.');
                      })
                    }
                    onRemove={() =>
                      runAction(`remove-${m.membership_id}`, async () => {
                        if (!window.confirm(`Remove ${displayName(m)} from the team? They will lose admin access.`)) {
                          return;
                        }
                        const res = await fetch('/api/team/remove', {
                          method: 'POST',
                          credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ membershipId: m.membership_id }),
                        });
                        const data = (await res.json()) as { error?: string };
                        if (!res.ok) throw new Error(data.error ?? 'Could not remove member.');
                        setSuccess('Team member removed.');
                      })
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(pending_approvals.length > 0 || acceptedAwaitingApproval.length > 0) && (
        <section className="admin-card overflow-hidden border-amber-500/25">
          <div className="border-b border-amber-500/20 bg-amber-500/5 px-6 py-4">
            <h2 className="admin-section-title text-amber-900 dark:text-amber-100">
              Pending approval
            </h2>
            <p className="admin-hint mt-1 text-amber-900/80 dark:text-amber-100/70">
              These people accepted an invite or requested access. Approve before they can use admin tools.
            </p>
          </div>
          <ul className="divide-y divide-admin">
            {pending_approvals.map((m) => (
              <PendingRow
                key={m.membership_id}
                member={m}
                caller={caller}
                actionPending={actionPending}
                onApprove={() =>
                  runAction(`approve-${m.membership_id}`, async () => {
                    const res = await fetch('/api/invites/approve', {
                      method: 'POST',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ membershipId: m.membership_id }),
                    });
                    const data = (await res.json()) as { error?: string };
                    if (!res.ok) throw new Error(data.error ?? 'Approve failed.');
                    setSuccess(`${displayName(m)} approved.`);
                  })
                }
                onReject={() =>
                  runAction(`reject-${m.membership_id}`, async () => {
                    const res = await fetch('/api/invites/reject', {
                      method: 'POST',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ membershipId: m.membership_id }),
                    });
                    const data = (await res.json()) as { error?: string };
                    if (!res.ok) throw new Error(data.error ?? 'Reject failed.');
                    setSuccess('Request rejected.');
                  })
                }
              />
            ))}
          </ul>
        </section>
      )}

      {pendingInvites.length > 0 && (
        <section className="admin-card overflow-hidden">
          <div className="border-b border-admin px-6 py-4">
            <h2 className="admin-section-title">Invited — not yet accepted</h2>
            <p className="admin-hint mt-0.5">Waiting for them to open the email link and sign in</p>
          </div>
          <ul className="divide-y divide-admin">
            {pendingInvites.map((inv) => (
              <InviteRow
                key={inv.id}
                invite={inv}
                caller={caller}
                actionPending={actionPending}
                onResend={() =>
                  runAction(`resend-${inv.id}`, async () => {
                    const res = await fetch('/api/invites/resend', {
                      method: 'POST',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ inviteId: inv.id }),
                    });
                    if (!res.ok) {
                      const data = (await res.json()) as { error?: string };
                      throw new Error(data.error ?? 'Resend failed.');
                    }
                    setSuccess('Invitation resent.');
                  })
                }
                onCancel={() =>
                  runAction(`cancel-${inv.id}`, async () => {
                    const res = await fetch('/api/invites/cancel', {
                      method: 'POST',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ inviteId: inv.id }),
                    });
                    if (!res.ok) {
                      const data = (await res.json()) as { error?: string };
                      throw new Error(data.error ?? 'Cancel failed.');
                    }
                    setSuccess('Invitation cancelled.');
                  })
                }
              />
            ))}
          </ul>
        </section>
      )}

      <TeamPermissionsMatrix
        highlightRole={(team.caller.role as StaffRole) ?? null}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`admin-card p-4 ${highlight ? 'ring-1 ring-amber-500/40' : ''}`}
    >
      <p className="admin-hint text-[11px] font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-admin-fg-strong">{value}</p>
    </div>
  );
}

type CallerPerms = TeamSnapshot['caller'];

function MemberTableRow({
  member,
  caller,
  assignable,
  actionPending,
  onChangeRole,
  onRemove,
  isOwner,
}: {
  member: TeamMemberRow;
  caller: CallerPerms;
  assignable: StaffRole[];
  actionPending: string | null;
  onApprove: () => void;
  onReject: () => void;
  onChangeRole: (role: StaffRole) => void;
  onRemove: () => void;
  isOwner?: boolean;
}) {
  const role = member.role as StaffRole;
  const perms = permissionSummary(role).slice(0, 3);
  const mid = member.membership_id ?? '';
  const canManageThis = caller.can_manage && !isOwner && !member.is_self;

  if (isOwner) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div>
          <p className="font-semibold text-admin-fg-strong">{displayName(member)}</p>
          <p className="admin-hint">{member.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status="active" />
          <span className="admin-badge admin-badge--approved">{ROLE_LABELS.owner}</span>
        </div>
      </div>
    );
  }

  return (
    <tr className="hover:bg-admin-nav-hover/30">
      <td className="px-6 py-4">
        <p className="font-medium text-admin-fg-strong">
          {displayName(member)}
          {member.is_self ? (
            <span className="admin-hint ml-2 font-normal">(you)</span>
          ) : null}
        </p>
        <p className="admin-hint">{member.email}</p>
      </td>
      <td className="px-4 py-4">
        {canManageThis ? (
          <select
            value={role}
            onChange={(e) => onChangeRole(e.target.value as StaffRole)}
            disabled={actionPending === `role-${mid}`}
            className="admin-input max-w-[11rem] py-1 text-[12px]"
          >
            {[role, ...assignable.filter((r) => r !== role)].filter(
              (r, i, arr) => arr.indexOf(r) === i,
            ).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        ) : (
          <span className="font-medium text-admin-fg-secondary">{ROLE_LABELS[role] ?? role}</span>
        )}
      </td>
      <td className="px-4 py-4">
        <StatusPill status={member.status} />
      </td>
      <td className="hidden px-4 py-4 lg:table-cell">
        <p className="admin-hint max-w-[14rem] leading-snug">
          {perms.join(' · ')}
          {permissionSummary(role).length > 3 ? '…' : ''}
        </p>
      </td>
      <td className="px-4 py-4 text-admin-muted">
        {formatTeamDate(member.approved_at ?? member.created_at)}
      </td>
      <td className="px-6 py-4 text-right">
        {canManageThis ? (
          <button
            type="button"
            disabled={actionPending === `remove-${mid}`}
            onClick={onRemove}
            className="text-[12px] font-medium text-red-600 hover:underline disabled:opacity-50"
          >
            {actionPending === `remove-${mid}` ? 'Removing…' : 'Remove'}
          </button>
        ) : (
          <span className="admin-hint">—</span>
        )}
      </td>
    </tr>
  );
}

function PendingRow({
  member,
  caller,
  actionPending,
  onApprove,
  onReject,
}: {
  member: TeamMemberRow;
  caller: CallerPerms;
  actionPending: string | null;
  onApprove: () => void;
  onReject: () => void;
}) {
  const mid = member.membership_id ?? '';
  return (
    <li className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
      <div>
        <p className="font-medium text-admin-fg-strong">{displayName(member)}</p>
        <p className="admin-hint">{member.email}</p>
        <p className="mt-1 text-[12px] text-admin-fg-secondary">
          {ROLE_LABELS[member.role as StaffRole] ?? member.role} · Invited {formatTeamDate(member.created_at)}
        </p>
      </div>
      {caller.can_approve ? (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={actionPending === `approve-${mid}`}
            onClick={onApprove}
            className="admin-btn-primary text-[13px]"
          >
            {actionPending === `approve-${mid}` ? '…' : 'Approve'}
          </button>
          <button
            type="button"
            disabled={actionPending === `reject-${mid}`}
            onClick={onReject}
            className="admin-btn-secondary text-[13px]"
          >
            Reject
          </button>
        </div>
      ) : null}
    </li>
  );
}

function InviteRow({
  invite,
  caller,
  actionPending,
  onResend,
  onCancel,
}: {
  invite: TeamInviteRow;
  caller: CallerPerms;
  actionPending: string | null;
  onResend: () => void;
  onCancel: () => void;
}) {
  const exp = new Date(invite.expires_at);
  const expired = exp.getTime() < Date.now();
  return (
    <li className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
      <div>
        <p className="font-medium text-admin-fg-strong">{invite.invited_email}</p>
        <p className="admin-hint">
          {ROLE_LABELS[invite.invited_role as StaffRole] ?? invite.invited_role} · Sent{' '}
          {formatTeamDate(invite.created_at)}
          {expired ? ' · Expired' : ` · Expires ${formatTeamDate(invite.expires_at)}`}
        </p>
      </div>
      {caller.can_invite ? (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={actionPending === `resend-${invite.id}`}
            onClick={onResend}
            className="admin-btn-secondary text-[13px]"
          >
            Resend
          </button>
          <button
            type="button"
            disabled={actionPending === `cancel-${invite.id}`}
            onClick={onCancel}
            className="admin-btn-secondary text-[13px]"
          >
            Cancel
          </button>
        </div>
      ) : null}
    </li>
  );
}

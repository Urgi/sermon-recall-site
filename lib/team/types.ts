import type { StaffRole } from '@/lib/auth/permissions';

export type TeamMemberRow = {
  membership_id: string | null;
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: StaffRole | string;
  status: string;
  approved_at?: string | null;
  created_at: string;
  is_self?: boolean;
};

export type TeamInviteRow = {
  id: string;
  invited_email: string;
  invited_role: string;
  status: string;
  expires_at: string;
  created_at: string;
  accepted_at?: string | null;
};

export type TeamCaller = {
  user_id: string;
  role: StaffRole | string | null;
  can_invite: boolean;
  can_approve: boolean;
  can_manage: boolean;
};

export type TeamSnapshot = {
  church_id: string;
  owner: TeamMemberRow | null;
  active_members: TeamMemberRow[];
  pending_approvals: TeamMemberRow[];
  invites: TeamInviteRow[];
  caller: TeamCaller;
};

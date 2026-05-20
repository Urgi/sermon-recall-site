import type { SupabaseClient } from '@supabase/supabase-js';

import type { StaffRole } from '@/lib/auth/permissions';
import type { AudienceType } from '@/lib/admin/workflow-status';
import { sendExpoPushMessages, type ExpoPushMessage } from '@/lib/push/expo-push';

export type BroadcastRecipient = {
  userId: string;
  staffRole: string | null;
  tokens: string[];
};

export type ResolveAudienceParams = {
  admin: SupabaseClient;
  churchId: string;
  audienceType?: AudienceType;
  targetStaffRoles?: StaffRole[];
  includeAllMembers?: boolean;
  excludeUserId?: string;
};

export async function resolveBroadcastRecipients(
  params: ResolveAudienceParams,
): Promise<{ recipients: BroadcastRecipient[] }> {
  const byUser = new Map<string, BroadcastRecipient>();

  const addUser = (userId: string, staffRole: string | null, token: string) => {
    if (params.excludeUserId && userId === params.excludeUserId) return;
    const existing = byUser.get(userId);
    if (existing) {
      if (!existing.tokens.includes(token)) existing.tokens.push(token);
      return;
    }
    byUser.set(userId, { userId, staffRole, tokens: [token] });
  };

  const useRoleTargeting =
    (params.targetStaffRoles?.length ?? 0) > 0 || params.includeAllMembers === true;

  if (useRoleTargeting) {
    if (params.targetStaffRoles?.length) {
      const { data: memberships, error: memErr } = await params.admin
        .from('church_memberships')
        .select('user_id, role')
        .eq('church_id', params.churchId)
        .eq('status', 'active')
        .in('role', params.targetStaffRoles);

      if (memErr) {
        console.warn('[resolve-audience] memberships', memErr.message);
      } else {
        const roleByUser = new Map<string, string>();
        for (const m of memberships ?? []) {
          roleByUser.set(m.user_id as string, m.role as string);
        }
        const userIds = Array.from(roleByUser.keys());
        if (userIds.length > 0) {
          const { data: users, error: uErr } = await params.admin
            .from('users')
            .select('id, user_push_tokens(expo_push_token)')
            .in('id', userIds);
          if (uErr) {
            console.warn('[resolve-audience] staff users', uErr.message);
          } else {
            for (const u of users ?? []) {
              const userId = u.id as string;
              const role = roleByUser.get(userId) ?? null;
              const embed = u.user_push_tokens as
                | { expo_push_token: string }
                | { expo_push_token: string }[]
                | null;
              const tokens: string[] = [];
              if (Array.isArray(embed)) {
                for (const e of embed) {
                  if (e.expo_push_token) tokens.push(e.expo_push_token);
                }
              } else if (embed?.expo_push_token) {
                tokens.push(embed.expo_push_token);
              }
              for (const t of tokens) addUser(userId, role, t);
              if (tokens.length === 0) {
                byUser.set(userId, { userId, staffRole: role, tokens: [] });
              }
            }
          }
        }
      }
    }

    if (params.includeAllMembers) {
      const { data: members, error: memErr } = await params.admin
        .from('users')
        .select('id, role, user_push_tokens(expo_push_token)')
        .eq('church_id', params.churchId);

      if (memErr) {
        console.warn('[resolve-audience] all members', memErr.message);
      } else {
        for (const r of members ?? []) {
          const userId = r.id as string;
          const embed = r.user_push_tokens as
            | { expo_push_token: string }
            | { expo_push_token: string }[]
            | null;
          const tokens: string[] = [];
          if (Array.isArray(embed)) {
            for (const e of embed) {
              if (e.expo_push_token) tokens.push(e.expo_push_token);
            }
          } else if (embed?.expo_push_token) {
            tokens.push(embed.expo_push_token);
          }
          for (const t of tokens) addUser(userId, r.role as string, t);
          if (tokens.length === 0 && !byUser.has(userId)) {
            byUser.set(userId, { userId, staffRole: r.role as string, tokens: [] });
          }
        }
      }
    }
  } else {
    const legacy = await resolveLegacyAudience(params);
    for (const r of legacy.recipients) {
      for (const t of r.tokens) addUser(r.userId, r.staffRole, t);
      if (r.tokens.length === 0) {
        byUser.set(r.userId, r);
      }
    }
  }

  return { recipients: Array.from(byUser.values()) };
}

async function resolveLegacyAudience(
  params: ResolveAudienceParams,
): Promise<{ recipients: BroadcastRecipient[] }> {
  const audienceType = params.audienceType ?? 'all_members';
  let query = params.admin
    .from('users')
    .select('id, role, user_push_tokens(expo_push_token), church_memberships(role, status)')
    .eq('church_id', params.churchId);

  if (audienceType === 'pastors_only') {
    query = query.in('role', ['pastor', 'admin']);
  }

  const { data: rows, error } = await query;
  if (error || !rows) {
    console.warn('[resolve-audience]', error?.message);
    return { recipients: [] };
  }

  const recipients: BroadcastRecipient[] = [];
  for (const r of rows) {
    if (params.excludeUserId && r.id === params.excludeUserId) continue;

    if (audienceType === 'pastors_only') {
      const memberships = r.church_memberships as
        | { role: string; status: string }
        | { role: string; status: string }[]
        | null;
      const mem = Array.isArray(memberships) ? memberships[0] : memberships;
      const isStaff =
        r.role === 'pastor' ||
        r.role === 'admin' ||
        (mem?.status === 'active' &&
          ['owner', 'admin_pastor', 'associate_pastor'].includes(mem.role));
      if (!isStaff) continue;
    }

    const embed = r.user_push_tokens as
      | { expo_push_token: string }
      | { expo_push_token: string }[]
      | null
      | undefined;
    const tokens: string[] = [];
    if (Array.isArray(embed)) {
      for (const e of embed) {
        if (e.expo_push_token) tokens.push(e.expo_push_token);
      }
    } else if (embed?.expo_push_token) {
      tokens.push(embed.expo_push_token);
    }

    const memberships = r.church_memberships as
      | { role: string; status: string }
      | { role: string; status: string }[]
      | null;
    const mem = Array.isArray(memberships) ? memberships[0] : memberships;
    recipients.push({
      userId: r.id as string,
      staffRole: mem?.status === 'active' ? (mem.role as string) : (r.role as string),
      tokens,
    });
  }

  return { recipients };
}

/** @deprecated Use resolveBroadcastRecipients */
export async function resolveAudienceTokens(
  params: ResolveAudienceParams,
): Promise<{ tokens: string[]; recipientCount: number }> {
  const { recipients } = await resolveBroadcastRecipients(params);
  const tokens = recipients.flatMap((r) => r.tokens);
  return { tokens, recipientCount: recipients.length };
}

export async function sendAudiencePush(params: {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<{ pushTicketErrors: string[]; tokenOrder: string[] }> {
  if (params.tokens.length === 0) {
    return { pushTicketErrors: [], tokenOrder: [] };
  }

  const messages: ExpoPushMessage[] = params.tokens.map((to) => ({
    to,
    title: params.title,
    body: params.body,
    sound: 'default',
    data: params.data,
  }));

  const { ticketErrors } = await sendExpoPushMessages(messages);
  return { pushTicketErrors: ticketErrors, tokenOrder: params.tokens };
}

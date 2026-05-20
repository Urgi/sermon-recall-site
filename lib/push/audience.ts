import type { SupabaseClient } from '@supabase/supabase-js';

import type { AudienceType } from '@/lib/admin/workflow-status';
import { sendExpoPushMessages, type ExpoPushMessage } from '@/lib/push/expo-push';

export type ResolveAudienceParams = {
  admin: SupabaseClient;
  churchId: string;
  audienceType: AudienceType;
  excludeUserId?: string;
};

const STAFF_ASSOCIATE_ELDER_ROLES = new Set(['associate_pastor', 'elder']);

function activeMembership(
  memberships:
    | { role: string; status: string }
    | { role: string; status: string }[]
    | null
    | undefined,
): { role: string; status: string } | null {
  if (!memberships) return null;
  const list = Array.isArray(memberships) ? memberships : [memberships];
  return list.find((m) => m.status === 'active') ?? null;
}

function collectPushTokens(
  embed:
    | { expo_push_token: string }
    | { expo_push_token: string }[]
    | null
    | undefined,
): string[] {
  if (!embed) return [];
  if (Array.isArray(embed)) {
    return embed.map((e) => e.expo_push_token).filter(Boolean);
  }
  return embed.expo_push_token ? [embed.expo_push_token] : [];
}

export async function resolveAudienceTokens(
  params: ResolveAudienceParams,
): Promise<{ tokens: string[]; recipientCount: number }> {
  let query = params.admin
    .from('users')
    .select('id, role, user_push_tokens(expo_push_token), church_memberships(role, status)');

  query = query.eq('church_id', params.churchId);

  if (params.audienceType === 'pastors_only') {
    query = query.in('role', ['pastor', 'admin']);
  }

  if (params.excludeUserId) {
    query = query.neq('id', params.excludeUserId);
  }

  const { data: rows, error } = await query;
  if (error || !rows) {
    console.warn('[resolve-audience]', error?.message);
    return { tokens: [], recipientCount: 0 };
  }

  const tokens: string[] = [];
  const seenUsers = new Set<string>();

  for (const r of rows) {
    const userId = r.id as string;
    const mem = activeMembership(
      r.church_memberships as
        | { role: string; status: string }
        | { role: string; status: string }[]
        | null,
    );

    if (params.audienceType === 'staff_associate_and_elder') {
      if (!mem?.role || !STAFF_ASSOCIATE_ELDER_ROLES.has(mem.role)) continue;
    } else if (params.audienceType === 'pastors_only') {
      const isLeadership =
        r.role === 'pastor' ||
        r.role === 'admin' ||
        (mem?.role &&
          ['owner', 'admin_pastor', 'associate_pastor'].includes(mem.role));
      if (!isLeadership) continue;
    }

    if (seenUsers.has(userId)) continue;
    seenUsers.add(userId);

    const embed = r.user_push_tokens as
      | { expo_push_token: string }
      | { expo_push_token: string }[]
      | null
      | undefined;
    for (const tok of collectPushTokens(embed)) {
      tokens.push(tok);
    }
  }

  return { tokens, recipientCount: seenUsers.size };
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

import type { SupabaseClient } from '@supabase/supabase-js';

import type { AudienceType } from '@/lib/admin/workflow-status';
import { sendExpoPushMessages, type ExpoPushMessage } from '@/lib/push/expo-push';

export type ResolveAudienceParams = {
  admin: SupabaseClient;
  churchId: string;
  audienceType: AudienceType;
  excludeUserId?: string;
};

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
  for (const r of rows) {
    if (params.audienceType === 'pastors_only') {
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
    if (!embed) continue;
    if (Array.isArray(embed)) {
      for (const e of embed) {
        if (e.expo_push_token) tokens.push(e.expo_push_token);
      }
    } else if (embed.expo_push_token) {
      tokens.push(embed.expo_push_token);
    }
  }

  return { tokens, recipientCount: tokens.length };
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

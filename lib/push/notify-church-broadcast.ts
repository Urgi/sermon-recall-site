import { sendExpoPushMessages } from '@/lib/push/expo-push';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type NotifyChurchBroadcastParams = {
  churchId: string;
  title: string;
  body: string;
  /** Omit notifications to this user (e.g. the sending pastor). */
  excludeUserId?: string;
};

/**
 * Sends a custom title/body push to all church members with Expo tokens.
 */
export async function notifyChurchBroadcast(
  params: NotifyChurchBroadcastParams,
): Promise<{ recipientCount: number }> {
  const admin = createServiceRoleClient();
  if (!admin) return { recipientCount: 0 };

  let query = admin
    .from('users')
    .select('id, user_push_tokens(expo_push_token)')
    .eq('church_id', params.churchId);

  if (params.excludeUserId) {
    query = query.neq('id', params.excludeUserId);
  }

  const { data: rows, error } = await query;
  if (error) {
    console.warn('[notify-church-broadcast]', error.message);
    return { recipientCount: 0 };
  }

  const tokens = (rows ?? [])
    .flatMap((r) => {
      const embed = r.user_push_tokens as
        | { expo_push_token: string }
        | { expo_push_token: string }[]
        | null
        | undefined;
      if (!embed) return [];
      if (Array.isArray(embed)) return embed.map((e) => e.expo_push_token);
      return [embed.expo_push_token];
    })
    .filter((t): t is string => typeof t === 'string' && t.length > 0);

  if (tokens.length === 0) return { recipientCount: 0 };

  const messages = tokens.map((to) => ({
    to,
    title: params.title,
    body: params.body,
    sound: 'default' as const,
    data: {
      kind: 'pastor_broadcast',
      churchId: params.churchId,
    },
  }));

  await sendExpoPushMessages(messages);
  return { recipientCount: tokens.length };
}

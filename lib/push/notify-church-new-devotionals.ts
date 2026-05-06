import { sendExpoPushMessages } from '@/lib/push/expo-push';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type NotifyChurchNewDevotionalsParams = {
  churchId: string;
  sermonId: string;
  sermonTitle: string;
  /** Omit notifications to this user (e.g. the publishing pastor). */
  excludeUserId?: string;
};

/**
 * Loads Expo tokens for church members and sends a single batched push per chunk.
 * No-ops when service role is not configured or no tokens exist.
 */
export async function notifyChurchNewDevotionals(
  params: NotifyChurchNewDevotionalsParams,
): Promise<void> {
  try {
    await notifyChurchNewDevotionalsInner(params);
  } catch (e) {
    console.warn('[notify-church-new-devotionals]', e);
  }
}

async function notifyChurchNewDevotionalsInner(
  params: NotifyChurchNewDevotionalsParams,
): Promise<void> {
  const admin = createServiceRoleClient();
  if (!admin) return;

  let query = admin
    .from('users')
    .select('id, user_push_tokens(expo_push_token)')
    .eq('church_id', params.churchId);

  if (params.excludeUserId) {
    query = query.neq('id', params.excludeUserId);
  }

  const { data: rows, error } = await query;
  if (error) {
    console.warn('[notify-church-new-devotionals]', error.message);
    return;
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

  if (tokens.length === 0) return;

  const title = 'New devotionals';
  const body =
    params.sermonTitle.length > 120
      ? `${params.sermonTitle.slice(0, 117)}…`
      : params.sermonTitle;

  const messages = tokens.map((to) => ({
    to,
    title,
    body,
    sound: 'default' as const,
    data: {
      kind: 'new_devotionals',
      sermonId: params.sermonId,
    },
  }));

  await sendExpoPushMessages(messages);
}

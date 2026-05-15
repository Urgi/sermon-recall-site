import { notifyChurchBroadcast } from '@/lib/push/notify-church-broadcast';
import type { SupabaseClient } from '@supabase/supabase-js';

export type SendPastorBroadcastParams = {
  admin: SupabaseClient;
  churchId: string;
  title: string;
  body: string;
  /** User id stored on church_broadcast_log.sent_by */
  sentBy: string;
  /** Optional: omit this user from receiving the push (e.g. the sending pastor). */
  excludeFromPushUserId?: string;
};

/**
 * Sends Expo push to church members and writes church_broadcast_log (service role).
 */
export async function sendPastorBroadcastAndLog(
  params: SendPastorBroadcastParams,
): Promise<{ recipientCount: number; pushTicketErrors: string[] }> {
  const includeSender =
    process.env.PASTOR_BROADCAST_INCLUDE_SENDER === 'true' ||
    process.env.PASTOR_BROADCAST_INCLUDE_SENDER === '1';

  const { recipientCount, pushTicketErrors } = await notifyChurchBroadcast({
    churchId: params.churchId,
    title: params.title,
    body: params.body,
    excludeUserId: includeSender ? undefined : params.excludeFromPushUserId,
  });

  const { error: logErr } = await params.admin.from('church_broadcast_log').insert({
    church_id: params.churchId,
    sent_by: params.sentBy,
    title: params.title,
    body: params.body,
    recipient_count: recipientCount,
  });

  if (logErr) {
    console.warn('[pastor-broadcast-send] log insert', logErr.message);
  }

  return { recipientCount, pushTicketErrors };
}

import type { SupabaseClient } from '@supabase/supabase-js';

import type { AudienceType } from '@/lib/admin/workflow-status';
import { resolveAudienceTokens, sendAudiencePush } from '@/lib/push/audience';
import { pruneStalePushTokens } from '@/lib/rate-limit';

export type SendPastorBroadcastParams = {
  admin: SupabaseClient;
  churchId: string;
  title: string;
  body: string;
  sentBy: string;
  audienceType?: AudienceType;
  excludeFromPushUserId?: string;
};

export async function sendPastorBroadcastAndLog(
  params: SendPastorBroadcastParams,
): Promise<{ recipientCount: number; pushTicketErrors: string[] }> {
  const includeSender =
    process.env.PASTOR_BROADCAST_INCLUDE_SENDER === 'true' ||
    process.env.PASTOR_BROADCAST_INCLUDE_SENDER === '1';

  const audienceType = params.audienceType ?? 'all_members';

  const { tokens, recipientCount } = await resolveAudienceTokens({
    admin: params.admin,
    churchId: params.churchId,
    audienceType,
    excludeUserId: includeSender ? undefined : params.excludeFromPushUserId,
  });

  let pushTicketErrors: string[] = [];
  if (tokens.length > 0) {
    const { pushTicketErrors: errs, tokenOrder } = await sendAudiencePush({
      tokens,
      title: params.title,
      body: params.body,
      data: {
        kind: 'pastor_broadcast',
        churchId: params.churchId,
      },
    });
    pushTicketErrors = errs;
    await pruneStalePushTokens(params.admin, errs, tokenOrder);
  }

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

import type { SupabaseClient } from '@supabase/supabase-js';

import type { AudienceType } from '@/lib/admin/workflow-status';
import type { StaffRole } from '@/lib/auth/permissions';
import { resolveBroadcastRecipients, sendAudiencePush } from '@/lib/push/audience';
import { pruneStalePushTokens } from '@/lib/rate-limit';

export type SendPastorBroadcastParams = {
  admin: SupabaseClient;
  churchId: string;
  title: string;
  body: string;
  sentBy: string;
  audienceType?: AudienceType;
  targetStaffRoles?: StaffRole[];
  includeAllMembers?: boolean;
  excludeFromPushUserId?: string;
};

export async function sendPastorBroadcastAndLog(
  params: SendPastorBroadcastParams,
): Promise<{ broadcastId: string | null; recipientCount: number; pushTicketErrors: string[] }> {
  const includeSender =
    process.env.PASTOR_BROADCAST_INCLUDE_SENDER === 'true' ||
    process.env.PASTOR_BROADCAST_INCLUDE_SENDER === '1';

  const { recipients } = await resolveBroadcastRecipients({
    admin: params.admin,
    churchId: params.churchId,
    audienceType: params.audienceType,
    targetStaffRoles: params.targetStaffRoles,
    includeAllMembers: params.includeAllMembers,
    excludeUserId: includeSender ? undefined : params.excludeFromPushUserId,
  });

  const tokens = recipients.flatMap((r) => r.tokens);
  const recipientCount = recipients.length;

  const { data: logRow, error: logErr } = await params.admin
    .from('church_broadcast_log')
    .insert({
      church_id: params.churchId,
      sent_by: params.sentBy,
      title: params.title,
      body: params.body,
      recipient_count: recipientCount,
      target_staff_roles:
        params.targetStaffRoles?.length ? params.targetStaffRoles : null,
      include_all_members: params.includeAllMembers ?? false,
    })
    .select('id')
    .single();

  if (logErr || !logRow?.id) {
    console.warn('[pastor-broadcast-send] log insert', logErr?.message);
    return { broadcastId: null, recipientCount, pushTicketErrors: [] };
  }

  const broadcastId = logRow.id as string;

  if (recipients.length > 0) {
    const { error: recErr } = await params.admin.from('church_broadcast_recipients').insert(
      recipients.map((r) => ({
        broadcast_id: broadcastId,
        user_id: r.userId,
        staff_role: r.staffRole,
      })),
    );
    if (recErr) {
      console.warn('[pastor-broadcast-send] recipients insert', recErr.message);
    }
  }

  let pushTicketErrors: string[] = [];
  if (tokens.length > 0) {
    const { pushTicketErrors: errs, tokenOrder } = await sendAudiencePush({
      tokens,
      title: params.title,
      body: params.body,
      data: {
        kind: 'pastor_broadcast',
        churchId: params.churchId,
        broadcastId,
      },
    });
    pushTicketErrors = errs;
    await pruneStalePushTokens(params.admin, errs, tokenOrder);
  }

  return { broadcastId, recipientCount, pushTicketErrors };
}

import { createServerSupabaseClient } from '@/lib/supabase/server';

export type AuditLogParams = {
  churchId: string | null;
  actorUserId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Writes an audit row via the write_audit_log RPC (SECURITY DEFINER).
 * Failures are logged but do not throw — audit must not break primary flows.
 */
export async function writeAuditLog(params: AuditLogParams): Promise<void> {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.rpc('write_audit_log', {
      p_church_id: params.churchId,
      p_actor_user_id: params.actorUserId,
      p_action: params.action,
      p_entity_type: params.entityType ?? null,
      p_entity_id: params.entityId ?? null,
      p_metadata: params.metadata ?? {},
    });
    if (error) {
      console.warn('[audit]', params.action, error.message);
    }
  } catch (e) {
    console.warn('[audit]', params.action, e);
  }
}

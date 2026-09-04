import { NextResponse } from 'next/server';

import { emailsMatchForDeletion } from '@/lib/account/deletion';
import { getRequestSupabaseUser } from '@/lib/supabase/request-user';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { confirmChurchDeletion?: unknown; confirmEmail?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body ok */
  }

  const { user, supabase, error: authError } = await getRequestSupabaseUser(req);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const confirmEmail = typeof body.confirmEmail === 'string' ? body.confirmEmail : '';
  if (!user.email || !emailsMatchForDeletion(confirmEmail, user.email)) {
    return NextResponse.json(
      { error: 'Enter your account email to confirm deletion.' },
      { status: 400 },
    );
  }

  const confirmChurchDeletion = body.confirmChurchDeletion === true;

  const { error: rpcError } = await supabase.rpc('delete_my_account', {
    p_confirm_church_deletion: confirmChurchDeletion,
  });

  if (rpcError) {
    const msg = rpcError.message;
    if (msg.includes('church_deletion_requires_confirmation')) {
      return NextResponse.json(
        { error: 'You must confirm that the church and member access will be removed.' },
        { status: 400 },
      );
    }
    console.warn('[account/delete] rpc', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      { error: 'Account data was removed but sign-in could not be finalized. Contact support.' },
      { status: 503 },
    );
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.warn('[account/delete] auth', deleteError.message);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

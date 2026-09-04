import { NextResponse } from 'next/server';

import { parseDeletionPreview } from '@/lib/account/deletion';
import { getRequestSupabaseUser } from '@/lib/supabase/request-user';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { user, supabase, error: authError } = await getRequestSupabaseUser(req);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data, error } = await supabase.rpc('get_account_deletion_preview');
  if (error) {
    console.warn('[account/deletion-preview]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const preview = parseDeletionPreview(data);
  if (!preview) {
    return NextResponse.json({ error: 'Invalid preview response.' }, { status: 500 });
  }

  return NextResponse.json({ preview, email: user.email ?? '' });
}

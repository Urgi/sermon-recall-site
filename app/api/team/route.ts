import { NextResponse } from 'next/server';

import type { TeamSnapshot } from '@/lib/team/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function mapRpcError(message: string): { status: number; error: string } {
  if (message.includes('not_authenticated')) return { status: 401, error: 'Sign in required.' };
  if (message.includes('forbidden') || message.includes('no_church')) {
    return { status: 403, error: 'You do not have permission to view the team.' };
  }
  return { status: 400, error: message };
}

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc('get_church_team_snapshot');

  if (error) {
    const mapped = mapRpcError(error.message);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }

  return NextResponse.json({ ok: true, team: data as TeamSnapshot });
}

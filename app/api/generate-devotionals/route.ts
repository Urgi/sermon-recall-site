import { NextResponse } from 'next/server';

import { canRegenerateWorkflow } from '@/lib/admin/workflow-status';
import type { SermonWorkflowStatus } from '@/lib/admin/workflow-status';
import { authorizeApiPermission } from '@/lib/auth/server';
import type { DevotionalDay } from '@/lib/devotionals/devotional-days';
import { parseDaysFromModelJson } from '@/lib/devotionals/devotional-days';
import { buildSixDayGenerationPrompt } from '@/lib/devotionals/devotional-prompts';
import { getOpenAIApiKeyFromEnv, runOpenAIJsonPrompt } from '@/lib/openai/run-openai-json';
import { checkRateLimit } from '@/lib/rate-limit';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const MAX_TRANSCRIPT_CHARS = 120_000;

/**
 * Preview only: calls OpenAI and returns days. Does not write devotionals to the database.
 */
export async function POST(req: Request) {
  if (!getOpenAIApiKeyFromEnv()) {
    return NextResponse.json(
      { error: 'Server missing OPENAI_API_KEY.' },
      { status: 500 },
    );
  }

  let body: { sermonId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const sermonId = typeof body.sermonId === 'string' ? body.sermonId.trim() : '';
  if (!sermonId) {
    return NextResponse.json({ error: 'sermonId is required.' }, { status: 400 });
  }

  const auth = await authorizeApiPermission('can_generate_devotionals');
  if (!auth.ok) return auth.response;

  const limit = await checkRateLimit(`openai-devotional:${auth.ctx.user.id}`, 15, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Generation rate limit reached. Try again later.' }, { status: 429 });
  }

  const supabase = createServerSupabaseClient();
  const profileRow = auth.ctx.profile;

  const { data: sermon, error: sermonError } = await supabase
    .from('sermons')
    .select('id, church_id, title, pastor_name, sermon_date, transcript, workflow_status')
    .eq('id', sermonId)
    .single();

  if (sermonError || !sermon) {
    return NextResponse.json({ error: 'Sermon not found.' }, { status: 404 });
  }

  if (sermon.church_id !== profileRow.church_id) {
    return NextResponse.json({ error: 'This sermon belongs to another church.' }, { status: 403 });
  }

  const wf = (sermon.workflow_status as SermonWorkflowStatus) ?? 'draft';
  if (!canRegenerateWorkflow(wf)) {
    return NextResponse.json(
      { error: 'Cannot regenerate while sermon is in review or published.' },
      { status: 409 },
    );
  }

  const transcript = (sermon.transcript as string | null)?.trim() ?? '';
  if (!transcript) {
    return NextResponse.json(
      { error: 'Add sermon script or notes before generating devotionals.' },
      { status: 400 },
    );
  }

  const transcriptSlice =
    transcript.length > MAX_TRANSCRIPT_CHARS
      ? `${transcript.slice(0, MAX_TRANSCRIPT_CHARS)}\n\n[Truncated for generation.]`
      : transcript;

  const prompt = buildSixDayGenerationPrompt({
    sermonTitle: sermon.title as string,
    pastorName: (sermon.pastor_name as string | null) ?? null,
    sermonDate: (sermon.sermon_date as string | null) ?? null,
    transcript: transcriptSlice,
  });

  const gen = await runOpenAIJsonPrompt(prompt);
  if ('status' in gen) {
    return NextResponse.json({ error: gen.error, hint: gen.hint }, { status: gen.status });
  }

  let days: DevotionalDay[];
  try {
    days = parseDaysFromModelJson(gen.text);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not parse model output.';
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  await supabase
    .from('sermons')
    .update({ workflow_status: 'generated' })
    .eq('id', sermonId);

  return NextResponse.json({ ok: true, days });
}

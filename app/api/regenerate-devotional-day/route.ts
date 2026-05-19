import { NextResponse } from 'next/server';

import { canManageSermons } from '@/lib/auth/profile';
import type { UserRole } from '@/lib/auth/profile';
import { buildSingleDayRegenerationPrompt } from '@/lib/gemini/devotional-prompts';
import type { GeminiDevotionalDay } from '@/lib/gemini/devotional-days';
import { parseSingleDayFromModelJson } from '@/lib/gemini/devotional-days';
import { getGeminiApiKeyFromEnv, runGeminiJsonPrompt } from '@/lib/gemini/run-gemini-json';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const MAX_TRANSCRIPT_CHARS = 120_000;

function sliceTranscript(transcript: string): string {
  const t = transcript.trim();
  if (t.length > MAX_TRANSCRIPT_CHARS) {
    return `${t.slice(0, MAX_TRANSCRIPT_CHARS)}\n\n[Truncated for generation.]`;
  }
  return t;
}

function isGeminiDay(v: unknown): v is GeminiDevotionalDay {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.day_number === 'number' && typeof o.title === 'string';
}

export async function POST(req: Request) {
  const apiKey = getGeminiApiKeyFromEnv();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Server missing GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY).' },
      { status: 500 },
    );
  }

  let body: {
    churchId?: string;
    title?: string;
    pastorName?: string | null;
    sermonDate?: string | null;
    transcript?: string;
    day?: unknown;
    instruction?: string;
    siblingPrePrompts?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const churchId = typeof body.churchId === 'string' ? body.churchId.trim() : '';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : '';
  const instruction = typeof body.instruction === 'string' ? body.instruction.trim() : '';

  if (!churchId || !title || !transcript) {
    return NextResponse.json(
      { error: 'churchId, title, and transcript are required.' },
      { status: 400 },
    );
  }
  if (!instruction) {
    return NextResponse.json({ error: 'instruction is required (what to change).' }, { status: 400 });
  }
  if (!isGeminiDay(body.day)) {
    return NextResponse.json({ error: 'day must be a full devotional day object.' }, { status: 400 });
  }
  const day = body.day;
  if (day.day_number < 1 || day.day_number > 6) {
    return NextResponse.json({ error: 'Invalid day_number.' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data: profileRow, error: profileError } = await supabase
    .from('users')
    .select('id, church_id, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profileRow) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 403 });
  }

  const profileRole = profileRow.role as UserRole;
  if (!canManageSermons(profileRole)) {
    return NextResponse.json({ error: 'Pastor or admin role required.' }, { status: 403 });
  }

  if (churchId !== profileRow.church_id) {
    return NextResponse.json({ error: 'Invalid or mismatched churchId.' }, { status: 403 });
  }

  const pastorName =
    typeof body.pastorName === 'string' && body.pastorName.trim()
      ? body.pastorName.trim()
      : null;
  const sermonDate =
    typeof body.sermonDate === 'string' && body.sermonDate.trim() ? body.sermonDate.trim() : null;

  const otherDaysPrePrompts: string[] = [];
  // Caller may pass siblingDays for better pre_prompt separation; optional.
  if (Array.isArray(body.siblingPrePrompts)) {
    for (const s of body.siblingPrePrompts) {
      if (typeof s === 'string' && s.trim()) otherDaysPrePrompts.push(s.trim());
    }
  }

  const prompt = buildSingleDayRegenerationPrompt({
    sermonTitle: title,
    pastorName,
    sermonDate,
    transcript: sliceTranscript(transcript),
    dayNumber: day.day_number,
    currentDayJson: JSON.stringify(day),
    otherDaysPrePrompts,
    instruction,
  });

  const gen = await runGeminiJsonPrompt(apiKey, prompt);
  if ('status' in gen) {
    return NextResponse.json({ error: gen.error, hint: gen.hint }, { status: gen.status });
  }

  let updated: GeminiDevotionalDay;
  try {
    updated = parseSingleDayFromModelJson(gen.text, day.day_number);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not parse model output.';
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  return NextResponse.json({ ok: true, day: updated });
}

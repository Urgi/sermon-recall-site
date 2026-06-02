import { NextResponse } from 'next/server';

import { authorizeApiPermission } from '@/lib/auth/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseYouTubeUrl } from '@/lib/transcription/constants';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function safeStoragePath(userId: string, sermonId: string, raw: string): string | null {
  const t = raw.trim();
  if (!t || t.includes('..')) return null;
  const parts = t.split('/').filter(Boolean);
  if (parts.length < 3) return null;
  if (parts[0] !== userId || parts[1] !== sermonId) return null;
  return parts.join('/');
}

export async function GET(req: Request) {
  const auth = await authorizeApiPermission('can_generate_devotionals');
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const jobId = url.searchParams.get('jobId')?.trim();
  const sermonId = url.searchParams.get('sermonId')?.trim();

  const supabase = createServerSupabaseClient();

  if (jobId) {
    const { data, error } = await supabase
      .from('sermon_transcription_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data || data.church_id !== auth.ctx.profile.church_id) {
      return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    }
    return NextResponse.json({ job: data });
  }

  if (sermonId) {
    const { data, error } = await supabase
      .from('sermon_transcription_jobs')
      .select('*')
      .eq('sermon_id', sermonId)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ job: data ?? null });
  }

  return NextResponse.json({ error: 'Provide jobId or sermonId.' }, { status: 400 });
}

export async function POST(req: Request) {
  let body: {
    sermonId?: string;
    sourceType?: string;
    storagePath?: string;
    youtubeUrl?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const sermonId = typeof body.sermonId === 'string' ? body.sermonId.trim() : '';
  if (!sermonId) {
    return NextResponse.json({ error: 'sermonId is required.' }, { status: 400 });
  }

  const auth = await authorizeApiPermission('can_generate_devotionals');
  if (!auth.ok) return auth.response;

  const limit = await checkRateLimit(`transcribe-job:${auth.ctx.user.id}`, 20, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Transcription rate limit reached.' }, { status: 429 });
  }

  const supabase = createServerSupabaseClient();
  const user = auth.ctx.user;
  const churchId = auth.ctx.profile.church_id;

  const { data: sermon, error: sermonError } = await supabase
    .from('sermons')
    .select('id, church_id')
    .eq('id', sermonId)
    .single();

  if (sermonError || !sermon) {
    return NextResponse.json({ error: 'Sermon not found.' }, { status: 404 });
  }
  if (sermon.church_id !== churchId) {
    return NextResponse.json({ error: 'This sermon belongs to another church.' }, { status: 403 });
  }

  const sourceType = body.sourceType === 'youtube' ? 'youtube' : 'storage';
  let storagePath: string | null = null;
  let sourceUrl: string | null = null;

  if (sourceType === 'youtube') {
    const raw = typeof body.youtubeUrl === 'string' ? body.youtubeUrl : '';
    sourceUrl = parseYouTubeUrl(raw);
    if (!sourceUrl) {
      return NextResponse.json({ error: 'Enter a valid YouTube URL.' }, { status: 400 });
    }
  } else {
    const raw = typeof body.storagePath === 'string' ? body.storagePath : '';
    storagePath = safeStoragePath(user.id, sermonId, raw);
    if (!storagePath) {
      return NextResponse.json({ error: 'Invalid storage path.' }, { status: 400 });
    }
  }

  const { data: existing } = await supabase
    .from('sermon_transcription_jobs')
    .select('id, status')
    .eq('sermon_id', sermonId)
    .in('status', ['pending', 'processing'])
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      ok: true,
      jobId: existing.id,
      message: 'Transcription already queued.',
    });
  }

  const { data: job, error: insertError } = await supabase
    .from('sermon_transcription_jobs')
    .insert({
      sermon_id: sermonId,
      church_id: churchId!,
      created_by: user.id,
      source_type: sourceType,
      storage_path: storagePath,
      source_url: sourceUrl,
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertError || !job) {
    return NextResponse.json({ error: insertError?.message ?? 'Could not queue job.' }, { status: 500 });
  }

  await supabase
    .from('sermons')
    .update({
      transcript: null,
      status: 'processing',
      transcript_status: 'queued',
      source_url: sourceUrl ?? undefined,
    })
    .eq('id', sermonId);

  return NextResponse.json({
    ok: true,
    jobId: job.id,
    message: 'Transcription queued. A background worker will process it shortly.',
  });
}

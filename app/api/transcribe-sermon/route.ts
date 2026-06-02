import { File } from 'node:buffer';

import { NextResponse } from 'next/server';

import { authorizeApiPermission } from '@/lib/auth/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { transcribeAudioBuffer } from '@/lib/openai/transcribe';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const MAX_BYTES = 50 * 1024 * 1024;

function safeStoragePath(userId: string, sermonId: string, raw: string): string | null {
  const t = raw.trim();
  if (!t || t.includes('..')) return null;
  const parts = t.split('/').filter(Boolean);
  if (parts.length < 3) return null;
  if (parts[0] !== userId || parts[1] !== sermonId) return null;
  return parts.join('/');
}

/**
 * Legacy sync transcription on Vercel (120s cap). Prefer POST /api/transcription/jobs + worker.
 * Kept for small dev tests only.
 */
export async function POST(req: Request) {
  let body: { sermonId?: string; storagePath?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const sermonId = typeof body.sermonId === 'string' ? body.sermonId.trim() : '';
  const storagePath =
    typeof body.storagePath === 'string' ? body.storagePath.trim() : '';
  if (!sermonId || !storagePath) {
    return NextResponse.json(
      { error: 'sermonId and storagePath are required (upload to sermon-media first).' },
      { status: 400 },
    );
  }

  const auth = await authorizeApiPermission('can_generate_devotionals');
  if (!auth.ok) return auth.response;

  const limit = await checkRateLimit(`transcribe:${auth.ctx.user.id}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Transcription rate limit reached.' }, { status: 429 });
  }

  const user = auth.ctx.user;
  const profileRow = auth.ctx.profile;
  const supabase = createServerSupabaseClient();

  const pathOk = safeStoragePath(user.id, sermonId, storagePath);
  if (!pathOk) {
    return NextResponse.json(
      { error: 'Invalid storage path (must be your user id, sermon id, then filename).' },
      { status: 400 },
    );
  }

  const { data: sermon, error: sermonError } = await supabase
    .from('sermons')
    .select('id, church_id')
    .eq('id', sermonId)
    .single();

  if (sermonError || !sermon) {
    return NextResponse.json({ error: 'Sermon not found.' }, { status: 404 });
  }

  if (sermon.church_id !== profileRow.church_id) {
    return NextResponse.json({ error: 'This sermon belongs to another church.' }, { status: 403 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      { error: 'Storage download is not configured (missing service role).' },
      { status: 503 },
    );
  }

  const { data: fileBlob, error: dlErr } = await admin.storage.from('sermon-media').download(pathOk);
  if (dlErr || !fileBlob) {
    return NextResponse.json(
      { error: dlErr?.message ?? 'Could not download uploaded file.' },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await fileBlob.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({ error: 'File is too large (max 50 MB).' }, { status: 400 });
  }

  const leaf = pathOk.split('/').pop() ?? 'upload';
  const mime = fileBlob.type || 'application/octet-stream';

  let transcript: string;
  try {
    if (mime.startsWith('text/') || leaf.toLowerCase().endsWith('.txt')) {
      transcript = buf.toString('utf8').trim();
      if (!transcript) {
        return NextResponse.json({ error: 'Text file was empty.' }, { status: 400 });
      }
    } else {
      transcript = await transcribeAudioBuffer({
        buffer: buf,
        filename: leaf,
        mimeType: mime || 'audio/mpeg',
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Transcription failed.';
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const { error: upErr } = await supabase
    .from('sermons')
    .update({ transcript })
    .eq('id', sermonId);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  void admin.storage.from('sermon-media').remove([pathOk]);

  return NextResponse.json({
    ok: true,
    charCount: transcript.length,
  });
}

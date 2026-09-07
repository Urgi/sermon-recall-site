import { NextResponse } from 'next/server';

import { authorizeApiPermission } from '@/lib/auth/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseYouTubeUrl } from '@/lib/transcription/constants';

export const dynamic = 'force-dynamic';

type OEmbedJson = {
  title?: unknown;
  author_name?: unknown;
  thumbnail_url?: unknown;
};

export async function GET(req: Request) {
  const auth = await authorizeApiPermission('can_generate_devotionals');
  if (!auth.ok) return auth.response;

  const raw = new URL(req.url).searchParams.get('url') ?? '';
  const normalized = parseYouTubeUrl(raw);
  if (!normalized) {
    return NextResponse.json({ error: 'Enter a valid YouTube URL.' }, { status: 400 });
  }

  const limit = await checkRateLimit(`youtube-meta:${auth.ctx.user.id}`, 60, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many lookups. Try again shortly.' }, { status: 429 });
  }

  const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(normalized)}&format=json`;
  try {
    const res = await fetch(oembed, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Could not load video details.' }, { status: 404 });
    }
    const data = (await res.json()) as OEmbedJson;
    const title = typeof data.title === 'string' ? data.title.trim() : '';
    if (!title) {
      return NextResponse.json({ error: 'Could not load video details.' }, { status: 404 });
    }
    return NextResponse.json({
      url: normalized,
      title,
      authorName: typeof data.author_name === 'string' ? data.author_name : null,
      thumbnailUrl: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : null,
    });
  } catch {
    return NextResponse.json({ error: 'Could not load video details.' }, { status: 502 });
  }
}

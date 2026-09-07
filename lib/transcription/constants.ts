/** Max sermon length we accept (1.5 hours). */
export const MAX_SERMON_DURATION_SEC = 90 * 60;

export const MAX_SERMON_DURATION_MINUTES = MAX_SERMON_DURATION_SEC / 60;

/** User-facing cap label (forms, help text). */
export const MAX_SERMON_DURATION_LABEL = '1.5 hours';

/** Recommended length for reliable transcription on current Groq tier. */
export const RECOMMENDED_SERMON_DURATION_MINUTES = 45;

export const RECOMMENDED_SERMON_DURATION_LABEL = '45 minutes';

/** Shared hint for upload / YouTube source fields. */
export const TRANSCRIPTION_LENGTH_HINT =
  'For the most reliable transcription, keep recordings under 45 minutes. We accept up to 1.5 hours, but longer files may fail or take longer to process.';

/** Groq paid-tier upload limit (single request when normalized file fits). */
export const GROQ_MAX_BYTES = 100 * 1024 * 1024;

/** OpenAI fallback chunk cap (stay under 25 MiB). */
export const OPENAI_MAX_BYTES = 24 * 1024 * 1024;

/** Target chunk length when splitting long audio (~10 minutes). */
export const CHUNK_DURATION_SEC = 600;

/** Recommended worker replicas at launch (~2 per 10 churches). */
export const RECOMMENDED_WORKER_REPLICAS = 2;

export type TranscriptionJobSourceType = 'storage' | 'youtube';

export type TranscriptionJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type TranscriptionJobRow = {
  id: string;
  sermon_id: string;
  church_id: string;
  created_by: string;
  status: TranscriptionJobStatus;
  source_type: TranscriptionJobSourceType;
  storage_path: string | null;
  source_url: string | null;
  duration_seconds: number | null;
  chunks_total: number;
  chunks_done: number;
  error_message: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
};

const YOUTUBE_VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

function isYouTubeVideoId(id: string | null | undefined): id is string {
  return Boolean(id && YOUTUBE_VIDEO_ID_RE.test(id));
}

function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

function hostIsYouTube(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  return (
    host === 'youtu.be' ||
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'music.youtube.com' ||
    host.endsWith('.youtube.com')
  );
}

/** Normalize a pastor-pasted YouTube link to a canonical watch URL. */
export function parseYouTubeUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;

  const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(withProto);
    if (!hostIsYouTube(u.hostname)) return null;

    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      return isYouTubeVideoId(id) ? youtubeWatchUrl(id) : null;
    }

    const fromQuery = u.searchParams.get('v');
    if (isYouTubeVideoId(fromQuery)) return youtubeWatchUrl(fromQuery);

    const parts = u.pathname.split('/').filter(Boolean);
    if (
      parts.length >= 2 &&
      ['shorts', 'embed', 'live', 'v'].includes(parts[0]!) &&
      isYouTubeVideoId(parts[1])
    ) {
      return youtubeWatchUrl(parts[1]!);
    }
  } catch {
    return null;
  }

  return null;
}

/** Pull the first recognizable YouTube URL out of pasted text. */
export function extractYouTubeUrl(raw: string): string | null {
  const direct = parseYouTubeUrl(raw);
  if (direct) return direct;

  const matches = raw.match(/https?:\/\/[^\s<>"']+/gi);
  if (!matches) return null;
  for (const candidate of matches) {
    const cleaned = candidate.replace(/[.,;:!?)]+$/, '');
    const parsed = parseYouTubeUrl(cleaned);
    if (parsed) return parsed;
  }
  return null;
}

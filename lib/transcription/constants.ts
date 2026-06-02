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

const YOUTUBE_RE =
  /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;

export function parseYouTubeUrl(raw: string): string | null {
  const t = raw.trim();
  const m = t.match(YOUTUBE_RE);
  if (!m?.[1]) return null;
  return `https://www.youtube.com/watch?v=${m[1]}`;
}

/**
 * Long-form transcription worker — run on Railway/Fly/VPS (not Vercel).
 *
 *   cd site && npm run worker:transcription
 *
 * Deploy **2 replicas** at launch (~2 workers per 10 churches). Each replica processes
 * one job at a time; scale replicas with church count (churches × 0.2).
 *
 * Requires: GROQ_API_KEY, ffmpeg, yt-dlp on PATH (or FFMPEG_PATH / YT_DLP_PATH),
 * NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
 */
import { config } from 'dotenv';
import { hostname } from 'node:os';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local'), override: true });

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { supabaseNodeWebSocketTransport } from '@/lib/supabase/node-ws-transport';

import type { TranscriptionJobRow } from '@/lib/transcription/constants';
import { RECOMMENDED_WORKER_REPLICAS } from '@/lib/transcription/constants';
import {
  failTranscriptionJob,
  processTranscriptionJob,
} from '@/lib/transcription/process-job';
import { materializeYoutubeCookiesAtStartup } from '@/lib/transcription/youtube-cookies';

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 2000);
const WORKER_ID =
  process.env.TRANSCRIPTION_WORKER_ID?.trim() || `${hostname()}-${process.pid}`;

function supabaseUrl(): string {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    ''
  );
}

function requireEnv(): SupabaseClient {
  const url = supabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('Missing SUPABASE URL or SUPABASE_SERVICE_ROLE_KEY.');
  }
  if (!process.env.GROQ_API_KEY?.trim()) {
    console.warn('[worker] GROQ_API_KEY not set — will fall back to OPENAI_API_KEY if present.');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: supabaseNodeWebSocketTransport },
  });
}

async function claimJob(admin: SupabaseClient): Promise<TranscriptionJobRow | null> {
  const { data, error } = await admin.rpc('claim_transcription_job', {
    p_worker_id: WORKER_ID,
  } as { p_worker_id: string });
  if (error) {
    console.error('[worker] claim error:', error.message);
    return null;
  }
  const row = data as TranscriptionJobRow | null;
  if (!row?.id || !row.sermon_id) {
    return null;
  }
  return row;
}

async function runLoop() {
  await materializeYoutubeCookiesAtStartup();
  const admin = requireEnv();
  console.info(
    `[worker] transcription worker ${WORKER_ID} started (poll ${POLL_MS}ms, recommended replicas: ${RECOMMENDED_WORKER_REPLICAS})`,
  );

  for (;;) {
    const job = await claimJob(admin);
    if (!job) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      continue;
    }

    console.info(`[worker] processing job ${job.id} sermon=${job.sermon_id} source=${job.source_type}`);
    try {
      await processTranscriptionJob(admin, job, async (chunksDone, chunksTotal) => {
        await admin
          .from('sermon_transcription_jobs')
          .update({
            chunks_done: chunksDone,
            chunks_total: chunksTotal,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);
      });
      console.info(`[worker] completed job ${job.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Transcription failed.';
      console.error(`[worker] failed job ${job.id}:`, msg);
      await failTranscriptionJob(admin, job.id, job.sermon_id, msg);
    }
  }
}

runLoop().catch((e) => {
  console.error('[worker] fatal:', e);
  process.exit(1);
});

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  GROQ_MAX_BYTES,
  MAX_SERMON_DURATION_SEC,
  OPENAI_MAX_BYTES,
  type TranscriptionJobRow,
} from '@/lib/transcription/constants';
import {
  downloadYouTubeAudio,
  normalizeToMp3,
  probeDurationSeconds,
  splitMp3IntoChunks,
} from '@/lib/transcription/ffmpeg';
import { transcribeAudioBuffer } from '@/lib/stt/transcribe';

type ProgressFn = (chunksDone: number, chunksTotal: number) => Promise<void>;

async function rmDirSafe(dir: string) {
  await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
}

function maxChunkBytes(): number {
  if (process.env.GROQ_API_KEY?.trim()) return GROQ_MAX_BYTES;
  return OPENAI_MAX_BYTES;
}

export async function processTranscriptionJob(
  admin: SupabaseClient,
  job: TranscriptionJobRow,
  onProgress?: ProgressFn,
): Promise<void> {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sr-transcribe-'));
  try {
    let sourcePath: string;
    if (job.source_type === 'youtube') {
      if (!job.source_url) throw new Error('Missing YouTube URL.');
      sourcePath = await downloadYouTubeAudio(job.source_url, path.join(workDir, 'yt'));
    } else {
      if (!job.storage_path) throw new Error('Missing storage path.');
      const { data, error } = await admin.storage.from('sermon-media').download(job.storage_path);
      if (error || !data) {
        throw new Error(error?.message ?? 'Could not download uploaded file.');
      }
      const buf = Buffer.from(await data.arrayBuffer());
      const leaf = job.storage_path.split('/').pop() ?? 'upload.bin';
      sourcePath = path.join(workDir, leaf);
      await fs.writeFile(sourcePath, buf);
    }

    const normalizedPath = path.join(workDir, 'normalized.mp3');
    await normalizeToMp3(sourcePath, normalizedPath);

    const durationSeconds = Math.ceil(await probeDurationSeconds(normalizedPath));
    if (durationSeconds > MAX_SERMON_DURATION_SEC) {
      throw new Error(
        `Recording is ${Math.ceil(durationSeconds / 60)} minutes — maximum is ${MAX_SERMON_DURATION_SEC / 60} minutes (1.5 hours).`,
      );
    }

    const stat = await fs.stat(normalizedPath);
    let chunkPaths: string[];
    if (stat.size <= maxChunkBytes()) {
      chunkPaths = [normalizedPath];
    } else {
      chunkPaths = await splitMp3IntoChunks(
        normalizedPath,
        path.join(workDir, 'chunks'),
      );
    }

    const chunksTotal = chunkPaths.length;
    await admin
      .from('sermon_transcription_jobs')
      .update({
        duration_seconds: durationSeconds,
        chunks_total: chunksTotal,
        chunks_done: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    const parts: string[] = [];
    for (let i = 0; i < chunkPaths.length; i++) {
      const buf = await fs.readFile(chunkPaths[i]!);
      const text = await transcribeAudioBuffer({
        buffer: buf,
        filename: `chunk-${i + 1}.mp3`,
        mimeType: 'audio/mpeg',
      });
      parts.push(text);
      await onProgress?.(i + 1, chunksTotal);
    }

    const transcript = parts.join('\n\n').trim();
    if (!transcript) {
      throw new Error('Transcription returned empty text.');
    }

    const sermonPatch: Record<string, unknown> = {
      transcript,
      status: 'processing',
      transcript_status: 'completed',
    };
    if (job.source_type === 'youtube' && job.source_url) {
      sermonPatch.source_url = job.source_url;
    }

    const { error: sermonErr } = await admin.from('sermons').update(sermonPatch).eq('id', job.sermon_id);

    if (sermonErr) {
      throw new Error(sermonErr.message);
    }

    if (job.storage_path) {
      await admin.storage.from('sermon-media').remove([job.storage_path]);
    }

    await admin
      .from('sermon_transcription_jobs')
      .update({
        status: 'completed',
        chunks_done: chunksTotal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);
  } finally {
    await rmDirSafe(workDir);
  }
}

export async function failTranscriptionJob(
  admin: SupabaseClient,
  jobId: string,
  sermonId: string,
  message: string,
): Promise<void> {
  await admin
    .from('sermon_transcription_jobs')
    .update({
      status: 'failed',
      error_message: message.slice(0, 2000),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  await admin
    .from('sermons')
    .update({
      status: 'failed',
      transcript_status: 'failed',
    })
    .eq('id', sermonId);
}

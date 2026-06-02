import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { CHUNK_DURATION_SEC } from '@/lib/transcription/constants';

export function ffmpegPath(): string {
  return process.env.FFMPEG_PATH?.trim() || 'ffmpeg';
}

export function ytDlpPath(): string {
  return process.env.YT_DLP_PATH?.trim() || 'yt-dlp';
}

export function run(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr?.on('data', (d: Buffer) => {
      stderr += d.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-800)}`));
    });
  });
}

export async function probeDurationSeconds(filePath: string): Promise<number> {
  const { stderr } = await run(ffmpegPath(), ['-i', filePath, '-f', 'null', '-']);
  const m = stderr.match(/Duration:\s(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!m) {
    throw new Error('Could not read audio duration.');
  }
  const sec = Number(m[1]) * 3600 + Number(m[2]) * 60 + parseFloat(m[3]!);
  if (!Number.isFinite(sec) || sec <= 0) {
    throw new Error('Invalid audio duration.');
  }
  return sec;
}

/** Normalize to mono 64 kbps MP3 for transcription. */
export async function normalizeToMp3(inputPath: string, outputPath: string): Promise<void> {
  await run(ffmpegPath(), [
    '-y',
    '-i',
    inputPath,
    '-ac',
    '1',
    '-ar',
    '16000',
    '-b:a',
    '64k',
    outputPath,
  ]);
}

export async function splitMp3IntoChunks(
  inputPath: string,
  outDir: string,
  chunkSec: number = CHUNK_DURATION_SEC,
): Promise<string[]> {
  await fs.mkdir(outDir, { recursive: true });
  const pattern = path.join(outDir, 'chunk_%03d.mp3');
  await run(ffmpegPath(), [
    '-y',
    '-i',
    inputPath,
    '-f',
    'segment',
    '-segment_time',
    String(chunkSec),
    '-c',
    'copy',
    pattern,
  ]);
  const files = (await fs.readdir(outDir))
    .filter((f) => f.startsWith('chunk_') && f.endsWith('.mp3'))
    .sort();
  if (files.length === 0) {
    return [inputPath];
  }
  return files.map((f) => path.join(outDir, f));
}

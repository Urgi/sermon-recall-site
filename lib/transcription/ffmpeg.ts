import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { CHUNK_DURATION_SEC } from '@/lib/transcription/constants';

function ffmpegPath(): string {
  return process.env.FFMPEG_PATH?.trim() || 'ffmpeg';
}

function ytDlpPath(): string {
  return process.env.YT_DLP_PATH?.trim() || 'yt-dlp';
}

function run(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
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

function ytDlpDownloadArgs(url: string, template: string): string[] {
  const args = [
    '--no-playlist',
    '--no-warnings',
    '-f',
    'bestaudio/best',
    '-o',
    template,
    // Helps on some hosts; datacenter IPs (Railway) often still need cookies — see YT_DLP_COOKIES_FILE.
    '--extractor-args',
    'youtube:player_client=android,web',
  ];
  const cookiesFile = process.env.YT_DLP_COOKIES_FILE?.trim();
  if (cookiesFile) {
    args.push('--cookies', cookiesFile);
  }
  const extra = process.env.YT_DLP_EXTRA_ARGS?.trim();
  if (extra) {
    args.push(...extra.split(/\s+/).filter(Boolean));
  }
  args.push(url);
  return args;
}

export async function downloadYouTubeAudio(url: string, outDir: string): Promise<string> {
  await fs.mkdir(outDir, { recursive: true });
  const template = path.join(outDir, 'youtube.%(ext)s');
  try {
    await run(ytDlpPath(), ytDlpDownloadArgs(url, template));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/not a bot|Sign in to confirm|Precondition check failed/i.test(msg)) {
      throw new Error(
        'YouTube blocked download from this server. Upload an MP3/M4A file instead, or set YT_DLP_COOKIES_FILE on the worker (exported YouTube cookies).',
      );
    }
    throw e;
  }
  const files = await fs.readdir(outDir);
  const audio = files.find((f) => f.startsWith('youtube.'));
  if (!audio) {
    throw new Error('YouTube download produced no file.');
  }
  return path.join(outDir, audio);
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

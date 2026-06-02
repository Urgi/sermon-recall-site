import { promises as fs } from 'node:fs';
import path from 'node:path';

import { parseYouTubeUrl } from '@/lib/transcription/constants';
import { ffmpegPath, run, ytDlpPath } from '@/lib/transcription/ffmpeg';
import { resolveYtDlpCookiesPath } from '@/lib/transcription/youtube-cookies';

const DEFAULT_INVIDIOUS =
  'https://invidious.io,https://inv.nadeko.net,https://invidious.nerdvpn.de';

function youtubeVideoId(url: string): string | null {
  const normalized = parseYouTubeUrl(url);
  if (!normalized) return null;
  try {
    return new URL(normalized).searchParams.get('v');
  } catch {
    return null;
  }
}

function ytDlpArgs(url: string, template: string, cookiesFile?: string): string[] {
  const args = [
    '--no-playlist',
    '--no-warnings',
    '--retries',
    '3',
    '--fragment-retries',
    '3',
    '-f',
    'bestaudio/best',
    '-o',
    template,
    '--extractor-args',
    'youtube:player_client=tv_embedded,android,web',
  ];
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

async function downloadViaYtDlp(
  url: string,
  outDir: string,
  cookiesFile?: string,
): Promise<string> {
  const template = path.join(outDir, 'youtube.%(ext)s');
  await run(ytDlpPath(), ytDlpArgs(url, template, cookiesFile));
  const files = await fs.readdir(outDir);
  const audio = files.find((f) => f.startsWith('youtube.') && !f.endsWith('.part'));
  if (!audio) {
    throw new Error('yt-dlp produced no audio file.');
  }
  return path.join(outDir, audio);
}

type InvidiousFormat = {
  type?: string;
  url?: string;
  bitrate?: string;
};

async function fetchInvidiousStreamUrl(videoId: string): Promise<string> {
  const instances = (process.env.YT_DLP_INVIDIOUS_INSTANCES?.trim() || DEFAULT_INVIDIOUS)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  let lastErr = 'no instances tried';

  for (const base of instances) {
    const root = base.replace(/\/$/, '');
    const apiUrl = `${root}/api/v1/videos/${videoId}?fields=adaptiveFormats`;
    try {
      const res = await fetch(apiUrl, {
        headers: { 'User-Agent': 'SermonRecall-TranscriptionWorker/1.0' },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) {
        lastErr = `${root} HTTP ${res.status}`;
        continue;
      }
      const data = (await res.json()) as { adaptiveFormats?: InvidiousFormat[] };
      const audio = (data.adaptiveFormats ?? [])
        .filter((f) => f.url && f.type?.startsWith('audio/'))
        .sort((a, b) => (Number(b.bitrate) || 0) - (Number(a.bitrate) || 0))[0];
      if (!audio?.url) {
        lastErr = `${root} no audio formats`;
        continue;
      }
      return audio.url.startsWith('http') ? audio.url : `${root}${audio.url}`;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }

  throw new Error(`Invidious fallback failed: ${lastErr}`);
}

async function downloadViaInvidious(videoId: string, outDir: string): Promise<string> {
  const streamUrl = await fetchInvidiousStreamUrl(videoId);
  const outPath = path.join(outDir, 'youtube-inv.m4a');
  await run(ffmpegPath(), [
    '-y',
    '-i',
    streamUrl,
    '-vn',
    '-ac',
    '1',
    '-ar',
    '16000',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    outPath,
  ]);
  return outPath;
}

function isYoutubeBotBlock(msg: string): boolean {
  return /not a bot|Sign in to confirm|Precondition check failed|HTTP Error 400/i.test(msg);
}

/**
 * Download YouTube audio for transcription. Tries yt-dlp (with cookies if configured), then Invidious.
 */
export async function downloadYouTubeAudio(url: string, outDir: string): Promise<string> {
  await fs.mkdir(outDir, { recursive: true });
  const normalized = parseYouTubeUrl(url);
  if (!normalized) {
    throw new Error('Invalid YouTube URL.');
  }

  const videoId = youtubeVideoId(normalized);
  const cookiesFile = await resolveYtDlpCookiesPath(outDir);
  const attempts: string[] = [];

  try {
    return await downloadViaYtDlp(normalized, outDir, cookiesFile);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    attempts.push(`yt-dlp: ${msg.slice(-200)}`);
    if (!isYoutubeBotBlock(msg) && !cookiesFile) {
      throw e;
    }
  }

  if (videoId) {
    try {
      console.info(`[worker] yt-dlp blocked; trying Invidious for ${videoId}`);
      return await downloadViaInvidious(videoId, outDir);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      attempts.push(`invidious: ${msg.slice(-200)}`);
    }
  }

  const hint = cookiesFile
    ? 'Refresh YT_DLP_COOKIES on the worker — exported cookies expire quickly.'
  : 'Set YT_DLP_COOKIES_BASE64 on Railway (Netscape cookies from a logged-in browser). See site/docs/youtube-worker-setup.md';

  throw new Error(
    `Could not download this YouTube video from the server. ${hint} Details: ${attempts.join(' | ')}`,
  );
}

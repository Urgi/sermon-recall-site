import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const GLOBAL_COOKIE_PATH = path.join(os.tmpdir(), 'sr-yt-dlp-cookies.txt');

let startupDone = false;

function cookiesFromEnv(): string | null {
  const b64 = process.env.YT_DLP_COOKIES_BASE64?.trim();
  if (b64) {
    return Buffer.from(b64, 'base64').toString('utf8');
  }
  const inline = process.env.YT_DLP_COOKIES?.trim();
  if (inline) {
    return inline.replace(/\\n/g, '\n');
  }
  return null;
}

/** Write cookies from env once so yt-dlp can auth on datacenter IPs (Railway). */
export async function materializeYoutubeCookiesAtStartup(): Promise<void> {
  if (startupDone) return;
  startupDone = true;

  const existing = process.env.YT_DLP_COOKIES_FILE?.trim();
  if (existing) {
    try {
      await fs.access(existing);
      console.info('[worker] using YT_DLP_COOKIES_FILE for YouTube downloads');
      return;
    } catch {
      console.warn('[worker] YT_DLP_COOKIES_FILE missing on disk:', existing);
    }
  }

  const content = cookiesFromEnv();
  if (!content) {
    console.warn(
      '[worker] no YouTube cookies configured — set YT_DLP_COOKIES or YT_DLP_COOKIES_BASE64 on Railway for reliable URL imports',
    );
    return;
  }

  await fs.writeFile(GLOBAL_COOKIE_PATH, content, { mode: 0o600 });
  process.env.YT_DLP_COOKIES_FILE = GLOBAL_COOKIE_PATH;
  console.info('[worker] materialized YouTube cookies for yt-dlp');
}

export async function resolveYtDlpCookiesPath(workDir: string): Promise<string | undefined> {
  const fileEnv = process.env.YT_DLP_COOKIES_FILE?.trim();
  if (fileEnv) {
    try {
      await fs.access(fileEnv);
      return fileEnv;
    } catch {
      /* fall through */
    }
  }

  const content = cookiesFromEnv();
  if (!content) return undefined;

  const p = path.join(workDir, 'youtube-cookies.txt');
  await fs.writeFile(p, content, { mode: 0o600 });
  return p;
}

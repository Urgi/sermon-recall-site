# YouTube URLs on the transcription worker (Railway)

YouTube often blocks audio downloads from cloud IPs (Railway, Render, AWS). The worker uses:

1. **yt-dlp** with optional **browser cookies** (most reliable)
2. **Invidious** fallback if yt-dlp is blocked and cookies are missing or expired

## Required for production YouTube links

Export cookies from a browser where you are signed in to YouTube (use a dedicated Google account, not a personal primary account).

Follow: [yt-dlp — Exporting YouTube cookies](https://github.com/yt-dlp/yt-dlp/wiki/Extractors#exporting-youtube-cookies)

Recommended: browser extension **"Get cookies.txt LOCALLY"** → export for `youtube.com` → Netscape format.

### Add to Railway (`just-upliftment` → `sermon-recall-site` → Variables)

**Option A — Base64 (easiest in Railway UI)**

1. Save the cookies file locally as `youtube-cookies.txt`.
2. Encode:
   ```bash
   base64 < youtube-cookies.txt | tr -d '\n' | pbcopy
   ```
3. New variable: `YT_DLP_COOKIES_BASE64` = paste (single line).

**Option B — Raw multiline**

Variable `YT_DLP_COOKIES` = full Netscape file contents (including `# Netscape HTTP Cookie File` header).

**Option C — File on volume**

Mount a Railway volume and set `YT_DLP_COOKIES_FILE=/data/youtube-cookies.txt`, upload the file once via shell.

Redeploy after changing variables.

## Verify

Deploy logs on startup:

```text
[worker] materialized YouTube cookies for yt-dlp
```

Queue a short YouTube sermon. Logs should show `processing job` → `completed job`, not bot errors.

## When cookies expire

Google rotates cookies. Re-export and update `YT_DLP_COOKIES_BASE64`, then redeploy.

## Optional

- `YT_DLP_INVIDIOUS_INSTANCES` — comma-separated Invidious bases if defaults fail.
- `YT_DLP_EXTRA_ARGS` — extra yt-dlp flags (space-separated).

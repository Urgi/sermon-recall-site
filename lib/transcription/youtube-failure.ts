export const YOUTUBE_OPS_ALERT_EMAIL = 'dev@afaantech.com';

export const YOUTUBE_TEMPORARILY_DOWN_MESSAGE =
  'YouTube is temporarily down. Please upload the audio or video file, or paste the sermon text, instead.';

export function youtubeFailureCode(jobId: string): string {
  const compact = jobId.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `YT-${compact || 'UNKNOWN'}`;
}

export function youtubeUserFailureMessage(code: string): string {
  return `${YOUTUBE_TEMPORARILY_DOWN_MESSAGE} (Ref ${code})`;
}

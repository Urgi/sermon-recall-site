/** Public marketing site copy and contact info (Apple / App Store business verification). */

export function publicSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}

export function supportEmail(): string {
  return process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || 'support@sermonrecall.com';
}

export const PUBLIC_SITE = {
  productName: 'Sermon Recall',
  legalName: 'Sermon Recall',
  tagline: 'Listen. Remember. Grow.',
  shortDescription:
    'Sermon Recall helps churches turn Sunday sermons into a six-day devotional journey so members remember and apply what they heard.',
} as const;

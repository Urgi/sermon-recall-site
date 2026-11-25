import { translateUi, type UiKey } from '@/lib/i18n/ui';

/** Public marketing site copy and contact info (Apple / App Store business verification). */

const DEFAULT_MARKETING_SITE_URL = 'https://sermonrecall.com';

/**
 * Canonical public marketing origin (sitemap, llms.txt, Open Graph, privacy copy).
 * Not the pastor admin auth origin — that is NEXT_PUBLIC_SITE_URL (often admin.sermonrecall.com).
 */
export function publicSiteUrl(): string {
  const marketing = process.env.NEXT_PUBLIC_MARKETING_SITE_URL?.trim();
  if (marketing) return stripTrailingSlash(safeOrigin(marketing) ?? marketing);

  // Local only — never use VERCEL_URL here (deployment hosts are not the public brand domain).
  if (process.env.NODE_ENV === 'development' && !process.env.VERCEL) {
    return 'http://localhost:3000';
  }

  return DEFAULT_MARKETING_SITE_URL;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

/** Origin only — drops accidental paths like /auth/callback from misconfigured env. */
function safeOrigin(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function supportEmail(): string {
  return process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || 'support@sermonrecall.com';
}

export const PUBLIC_SITE = {
  productName: 'Sermon Recall',
  legalName: 'Sermon Recall',
  tagline: 'A six-day devotional journey from every sermon.',
  shortDescription:
    "Sermon Recall helps churches turn Saturday/Sunday's message into a six-day devotional journey so members remember and apply what they heard.",
} as const;

/** Member app store links (override via env if the listing URL changes). */
export const GOOGLE_PLAY_URL =
  process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL?.trim() ||
  'https://play.google.com/store/apps/details?id=com.antoineassociates.sermonrecall';

/** App Store listing (Apple ID 6798402169). Override via env if the URL changes. */
export const APP_STORE_URL =
  process.env.NEXT_PUBLIC_APP_STORE_URL?.trim() ||
  'https://apps.apple.com/app/id6798402169';

/** Homepage + FAQ page — curated list from ministry positioning doc (12 key objections). Copy lives in lib/i18n/ui.ts. */
export const PUBLIC_FAQ_KEYS = Array.from({ length: 12 }, (_, i) => ({
  question: `pub.faq.q${i + 1}` as UiKey,
  answer: `pub.faq.a${i + 1}` as UiKey,
}));

/** English FAQ for structured data and llms.txt (crawlers read the English, indexable version). */
export const PUBLIC_FAQ = PUBLIC_FAQ_KEYS.map((item) => ({
  question: translateUi('en', item.question),
  answer: translateUi('en', item.answer),
}));

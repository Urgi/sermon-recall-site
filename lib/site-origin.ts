/**
 * Origin (scheme + host) of a configured URL, ignoring any path.
 * NEXT_PUBLIC_SITE_URL was once set to `.../auth/callback`, which leaked into
 * invite, join and billing links; building from the origin keeps them correct.
 */
export function originOf(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : null;
  } catch {
    return null;
  }
}

/** Public site origin: NEXT_PUBLIC_SITE_URL, else the Vercel deployment URL, else localhost. */
export function siteOrigin(): string {
  const vercel = process.env.VERCEL_URL?.trim();
  return (
    originOf(process.env.NEXT_PUBLIC_SITE_URL) ||
    (vercel ? `https://${vercel}` : null) ||
    'http://localhost:3000'
  );
}

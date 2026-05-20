/**
 * Email confirmation / password reset must return to the admin web origin,
 * never the mobile app scheme (PKCE verifier lives in the browser that signed up).
 */
export function getAdminEmailRedirectUrl(nextPath?: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  const base =
    configured ||
    (typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : '');

  if (!base) return '';

  if (nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')) {
    return `${base}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  }
  return `${base}/auth/callback`;
}

function normalizeOrigin(origin: string | null | undefined): string | null {
  if (!origin?.trim()) return null;
  try {
    const url = new URL(origin.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.origin.replace(/\/$/, '');
  } catch {
    return null;
  }
}

/**
 * Server-side redirect for auth emails (no `window`).
 * Prefer NEXT_PUBLIC_SITE_URL; else the browser Origin from the request; else VERCEL_URL.
 */
export function getAdminEmailRedirectUrlServer(
  nextPath?: string,
  requestOrigin?: string | null,
): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  const fromRequest = normalizeOrigin(requestOrigin);
  const vercel = process.env.VERCEL_URL?.trim();
  const base = configured || fromRequest || (vercel ? `https://${vercel}` : '');
  if (!base) return '';
  if (nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')) {
    return `${base}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  }
  return `${base}/auth/callback`;
}

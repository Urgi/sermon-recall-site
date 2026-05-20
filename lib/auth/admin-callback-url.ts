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

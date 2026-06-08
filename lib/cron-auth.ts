/** Validates Vercel Cron (or manual) bearer auth. Trims secret to survive copy/paste newlines. */
export function authorizeCronRequest(req: Request):
  | { ok: true; secretConfigured: true }
  | { ok: false; status: number; error: string; secretConfigured: boolean } {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get('authorization')?.trim();
  if (!secret) {
    return {
      ok: false,
      status: 503,
      error: 'CRON_SECRET is not configured on this deployment.',
      secretConfigured: false,
    };
  }
  if (auth !== `Bearer ${secret}`) {
    return { ok: false, status: 401, error: 'Unauthorized.', secretConfigured: true };
  }
  return { ok: true, secretConfigured: true };
}

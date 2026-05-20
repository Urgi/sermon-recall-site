# Auth email debugging (pastor confirm / resend)

## Why you see “sent” but no inbox email

| Environment | What happens |
|-------------|----------------|
| **Local** (`supabase start`) | Emails go to **Inbucket**, not Gmail/Yahoo → http://127.0.0.1:54324 |
| **Hosted + no Resend** | Supabase built-in mail (~**2/hour**) — often dropped or spam |
| **Hosted + Resend** | `/api/auth/resend-confirmation` sends via Resend (reliable) |

`NEXT_PUBLIC_SUPABASE_URL` is **not** your website URL. Confirmation links need `NEXT_PUBLIC_SITE_URL` or `https://admin.sermonrecall.com` in Supabase redirect URLs.

## Local diagnostic UI

```bash
cd /path/to/sermon-recall
supabase start
cd site && npm run dev
```

Open: **http://localhost:3000/dev/auth-email**

1. Enter the test email (e.g. `shashoturi@gmail.com`)
2. **Check config** — env vars, user confirmed?, hints
3. **Dry run** — shows `debugActionLink` (dev only)
4. Register/resend on login — then check **Inbucket** for Supabase-native mail

`.env.local` for local site:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<from supabase start>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
RESEND_API_KEY=re_...   # optional locally; use Inbucket without it
```

## Production checklist

Vercel env:

- `NEXT_PUBLIC_SITE_URL=https://admin.sermonrecall.com`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `INVITE_EMAIL_FROM=Sermon Recall <dev@afaantech.com>`

Supabase → **Authentication → URL configuration**:

- Site URL: `https://admin.sermonrecall.com`
- Redirect: `https://admin.sermonrecall.com/auth/callback`, `https://admin.sermonrecall.com/**`

Resend dashboard → **Emails** — see sent/bounced.

Login resend success copy should say **“sent from Sermon Recall”** — if you only see generic “check spam”, production is on old code or falling back to Supabase mail.

## Turn off confirm (no email required)

**Authentication → Sign In / Providers → Email** → disable **Confirm email** (not the Templates tab).

Pastors can also register via `/api/auth/register-admin` (auto-confirmed) when `SUPABASE_SERVICE_ROLE_KEY` is set.

## Manual unblock

Supabase → **Authentication → Users** → select user → **Confirm user**.

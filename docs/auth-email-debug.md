# Auth email debugging (pastor confirm / resend)

## Why you see “sent” but no inbox email

| Environment | What happens |
|-------------|----------------|
| **Local** (`supabase start`) | Emails go to **Inbucket**, not Gmail/Yahoo → http://127.0.0.1:54324 |
| **Hosted** | Supabase sends a **confirmation code** email — paste template from `supabase/templates/confirmation.html` |

`NEXT_PUBLIC_SUPABASE_URL` is **not** your website URL. Password reset links still use `NEXT_PUBLIC_SITE_URL` and `/auth/callback?next=reset-password`.

**Signup confirmation** uses a code on `/verify-email` (admin) or `/verify-email` in the mobile app — not email links.

**Password reset** uses a code on `/reset-password` (admin + mobile) — not email links.

## Local diagnostic UI

```bash
cd /path/to/sermon-recall
supabase start
cd site && npm run dev
```

Open: **http://localhost:3000/dev/auth-email**

1. Enter the test email (e.g. `shashoturi@gmail.com`)
2. **Check config** — env vars, user confirmed?, hints
3. **Dry run** — register, then check **Inbucket** for the OTP email
4. Confirm at **http://localhost:3000/verify-email** with the code

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
- `SUPABASE_SERVICE_ROLE_KEY` (cron, invites — not required for pastor signup OTP)

Supabase → **Authentication → Email templates**:
- **Confirm signup** — code-only body from `supabase/templates/confirmation.html` (`{{ .Token }}`)
- **Reset password** — code-only body from `supabase/templates/recovery.html` (`{{ .Token }}`)

Supabase → **Authentication → URL configuration** (optional legacy / invite links only):

- Site URL: `https://admin.sermonrecall.com`
- Redirect: `https://admin.sermonrecall.com/auth/callback`, `https://admin.sermonrecall.com/**`

Login **Resend confirmation code** uses Supabase Auth directly (same as mobile).

## Turn off confirm (no email required)

**Authentication → Sign In / Providers → Email** → disable **Confirm email** (not the Templates tab).

Pastors register on `/register` → `/verify-email` with the emailed code. Legacy `/api/auth/register-admin` (auto-confirmed) is unused by the UI.

## Manual unblock

Supabase → **Authentication → Users** → select user → **Confirm user**.

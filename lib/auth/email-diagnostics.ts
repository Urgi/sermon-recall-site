import { getAdminEmailRedirectUrlServer } from '@/lib/auth/admin-callback-url';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type EmailDiagnosticsReport = {
  environment: string;
  redirectTo: string | null;
  env: {
    NEXT_PUBLIC_SITE_URL: boolean;
    NEXT_PUBLIC_SUPABASE_URL: boolean;
    SUPABASE_SERVICE_ROLE_KEY: boolean;
    RESEND_API_KEY: boolean;
    INVITE_EMAIL_FROM: string | null;
  };
  supabase: {
    projectHost: string | null;
    isLocal: boolean;
    inbucketUrl: string | null;
  };
  userLookup?: {
    exists: boolean;
    emailConfirmed: boolean;
    createdAt: string | null;
    lastSignInAt: string | null;
  };
  path: {
    resendApiReady: boolean;
    clientFallbackOnly: boolean;
  };
  hints: string[];
};

export async function buildEmailDiagnostics(
  email?: string,
  requestOrigin?: string | null,
): Promise<EmailDiagnosticsReport> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const isLocal =
    supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost');
  const projectHost = supabaseUrl ? new URL(supabaseUrl).host : null;

  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  const hasResend = Boolean(process.env.RESEND_API_KEY?.trim());
  const redirectTo = getAdminEmailRedirectUrlServer(undefined, requestOrigin) || null;

  const hints: string[] = [];

  if (!process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
    hints.push(
      'Set NEXT_PUBLIC_SITE_URL=https://admin.sermonrecall.com on Vercel (not the Supabase URL).',
    );
  }
  if (!hasServiceRole) {
    hints.push('Missing SUPABASE_SERVICE_ROLE_KEY — resend uses weak Supabase mail fallback.');
  }
  if (!hasResend) {
    hints.push(
      'Missing RESEND_API_KEY — add the same key used for team invites, or use local Inbucket.',
    );
  }
  if (!redirectTo) {
    hints.push('Could not compute auth callback URL for email links.');
  } else if (!redirectTo.includes('admin.sermonrecall.com') && !isLocal) {
    hints.push(
      `Redirect is ${redirectTo} — ensure this exact URL is in Supabase → Authentication → URL configuration.`,
    );
  }
  if (isLocal) {
    hints.push(
      'Local Supabase: emails do NOT go to real inboxes. Open Inbucket at http://127.0.0.1:54324 after supabase start.',
    );
  } else if (!hasResend) {
    hints.push(
      'Hosted Supabase built-in mail is ~2 emails/hour. Use Resend (RESEND_API_KEY) or custom SMTP in Supabase.',
    );
  }

  const report: EmailDiagnosticsReport = {
    environment: process.env.NODE_ENV ?? 'unknown',
    redirectTo,
    env: {
      NEXT_PUBLIC_SITE_URL: Boolean(process.env.NEXT_PUBLIC_SITE_URL?.trim()),
      NEXT_PUBLIC_SUPABASE_URL: Boolean(supabaseUrl),
      SUPABASE_SERVICE_ROLE_KEY: hasServiceRole,
      RESEND_API_KEY: hasResend,
      INVITE_EMAIL_FROM: process.env.INVITE_EMAIL_FROM?.trim() || null,
    },
    supabase: {
      projectHost,
      isLocal,
      inbucketUrl: isLocal ? 'http://127.0.0.1:54324' : null,
    },
    path: {
      resendApiReady: hasServiceRole && hasResend && Boolean(redirectTo),
      clientFallbackOnly: !hasServiceRole || !hasResend,
    },
    hints,
  };

  if (email?.trim() && hasServiceRole) {
    const admin = createServiceRoleClient();
    if (admin) {
      const { data, error } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (!error && data?.users) {
        const match = data.users.find(
          (u) => u.email?.toLowerCase() === email.trim().toLowerCase(),
        );
        if (match) {
          report.userLookup = {
            exists: true,
            emailConfirmed: Boolean(match.email_confirmed_at),
            createdAt: match.created_at ?? null,
            lastSignInAt: match.last_sign_in_at ?? null,
          };
          if (match.email_confirmed_at) {
            hints.push('User is already confirmed — sign in with password; resend is not needed.');
          }
        } else {
          report.userLookup = {
            exists: false,
            emailConfirmed: false,
            createdAt: null,
            lastSignInAt: null,
          };
          hints.push('No auth user for this email — register first.');
        }
      }
    }
  }

  return report;
}

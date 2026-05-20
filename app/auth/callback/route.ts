import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Handles email confirmation and other auth redirects from Supabase.
 * Add this URL to Supabase → Authentication → URL configuration → Redirect URLs.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') ?? '/login?confirmed=1';
  const origin = requestUrl.origin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.redirect(`${origin}/login?error=server_config`);
  }

  const cookieStore = cookies();
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* ignore when called from a context that cannot set cookies */
        }
      },
    },
  });

  const redirectSuccess = (target: string) => {
    const safe =
      target.startsWith('/') && !target.startsWith('//') ? target : '/login?confirmed=1';
    return NextResponse.redirect(`${origin}${safe}`);
  };

  if (!code && !(tokenHash && type)) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      return redirectSuccess('/login?confirmed=1');
    }
    return NextResponse.redirect(`${origin}/login?error=missing_auth_code`);
  }

  let exchangeError: { message: string } | null = null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) exchangeError = error;
  } else if (tokenHash && type) {
    const otpType = type as 'signup' | 'email' | 'recovery' | 'email_change';
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });
    if (error) exchangeError = error;
  }

  if (exchangeError) {
    console.warn('[auth/callback]', exchangeError.message);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      return redirectSuccess(next);
    }
    const msg = exchangeError.message.toLowerCase();
    if (msg.includes('already been used') || msg.includes('expired')) {
      return NextResponse.redirect(
        `${origin}/login?confirmed=1&already_used=1`,
      );
    }
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
  }

  return redirectSuccess(next);
}

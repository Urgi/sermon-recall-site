import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export type MiddlewareAuthUser = {
  id: string;
};

export type MiddlewareSession = {
  response: NextResponse;
  user: MiddlewareAuthUser | null;
};

/** Copy refreshed session cookies onto redirect responses. */
export function copyResponseCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
}

/**
 * Refreshes the Supabase session and returns the response that must carry Set-Cookie headers.
 * Call from root middleware only — do not import this from Server Components or API routes.
 */
export async function updateSession(request: NextRequest): Promise<MiddlewareSession> {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return { response, user: null };
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  let user: MiddlewareAuthUser | null = null;
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser ? { id: authUser.id } : null;
  } catch (e) {
    console.warn(
      '[middleware] Supabase auth request failed (offline, bad URL, or network). Treating as signed out.',
      e,
    );
  }

  return { response, user };
}

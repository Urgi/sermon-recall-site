import { copyResponseCookies, updateSession } from '@/lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { response: supabaseResponse, user } = await updateSession(request);

  const path = request.nextUrl.pathname;
  const isProtected = path.startsWith('/dashboard') || path.startsWith('/sermons');
  const isAuthPage = path === '/login' || path === '/register';

  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', path);
    const redirect = NextResponse.redirect(loginUrl);
    copyResponseCookies(supabaseResponse, redirect);
    return redirect;
  }

  if (user && isAuthPage) {
    const dash = request.nextUrl.clone();
    dash.pathname = '/dashboard';
    dash.search = '';
    const redirect = NextResponse.redirect(dash);
    copyResponseCookies(supabaseResponse, redirect);
    return redirect;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

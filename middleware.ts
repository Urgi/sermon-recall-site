import { copyResponseCookies, updateSession } from '@/lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { response: supabaseResponse, user } = await updateSession(request);

  const path = request.nextUrl.pathname;
  const isProtected =
    path.startsWith('/dashboard') ||
    path.startsWith('/sermons') ||
    path.startsWith('/settings') ||
    path.startsWith('/notifications') ||
    path.startsWith('/team');
  const isAuthPage =
    path === '/login' ||
    path === '/register' ||
    path === '/forgot-password' ||
    path === '/reset-password';

  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', path);
    const redirect = NextResponse.redirect(loginUrl);
    copyResponseCookies(supabaseResponse, redirect);
    return redirect;
  }

  if (user && isAuthPage) {
    const loginParams = request.nextUrl.searchParams;
    const stayOnLogin =
      path === '/login' &&
      (loginParams.get('confirmed') === '1' ||
        loginParams.get('setup') === 'failed' ||
        loginParams.get('email_sent') === '1');
    const allowResetPassword = path === '/reset-password';
    if (!stayOnLogin && !allowResetPassword) {
      const dash = request.nextUrl.clone();
      dash.pathname = '/dashboard';
      dash.search = '';
      const redirect = NextResponse.redirect(dash);
      copyResponseCookies(supabaseResponse, redirect);
      return redirect;
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

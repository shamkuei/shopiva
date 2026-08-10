import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Lightweight route gate based on the presence of the `access_token` cookie.
 *
 * httpOnly cookies are not readable by client JS, but they ARE readable
 * server-side — including here in the Next.js middleware (edge) layer — so we
 * can redirect before the page even renders. The authoritative auth check still
 * happens at the API (the cookie may be expired); this just avoids flashes of
 * the protected/logged-in pages.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAccessToken = Boolean(request.cookies.get('access_token')?.value);

  // Not logged in -> bounce off protected admin pages.
  if (pathname.startsWith('/admin') && !hasAccessToken) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Already logged in -> skip the auth pages.
  if ((pathname === '/login' || pathname === '/register') && hasAccessToken) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login', '/register'],
};

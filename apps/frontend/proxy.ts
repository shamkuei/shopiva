import { NextResponse, type NextRequest } from 'next/server';

/**
 * Optimistic auth gate for /admin/* (Next 16 Proxy — formerly Middleware).
 * Only checks for the presence of the access/refresh cookies; the real
 * verification happens in app/admin/layout.tsx and server-side on the API.
 * This just avoids rendering the admin shell at all for clearly-logged-out
 * visitors and keeps /login free of an authenticated-user redirect loop.
 */
export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession =
    req.cookies.has('access_token') || req.cookies.has('refresh_token');

  if (pathname.startsWith('/admin') && !hasSession) {
    const url = new URL('/login', req.nextUrl);
    return NextResponse.redirect(url);
  }

  if (pathname === '/login' && hasSession) {
    const url = new URL('/admin', req.nextUrl);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Skip API routes, static assets, and Next internals.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|fonts|.*\\.png$|.*\\.svg$).*)'],
};

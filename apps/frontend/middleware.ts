import { NextResponse, type NextRequest } from 'next/server';

/**
 * Subdomain-based store routing + auth gating.
 *
 * The store is chosen by the Host header:
 *   acme.yourdomain.com  -> store "acme"
 *   yourdomain.com       -> apex (marketing, login, register, admin — no store)
 *
 * For local dev, *.localhost works the same (acme.localhost:3000 -> "acme"),
 * and `?store=<subdomain>` overrides the Host for convenience.
 *
 * The resolved subdomain is passed to server components via the
 * `x-store-subdomain` request header, and mirrored into a (non-httpOnly)
 * `store-subdomain` cookie so client components can read it too.
 */

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? 'localhost';

function extractSubdomain(host: string): string | null {
  const hostname = host.split(':')[0].toLowerCase();
  if (!hostname || hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`) {
    return null;
  }
  const suffix = `.${ROOT_DOMAIN}`;
  return hostname.endsWith(suffix) ? hostname.slice(0, -suffix.length) : null;
}

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const hasAccessToken = Boolean(req.cookies.get('access_token')?.value);

  // ── Auth gating (unchanged) ───────────────────────────────────────
  if (pathname.startsWith('/admin') && !hasAccessToken) {
    return redirect(req, '/login');
  }
  if ((pathname === '/login' || pathname === '/register') && hasAccessToken) {
    return redirect(req, '/admin');
  }

  // ── Subdomain resolution ──────────────────────────────────────────
  const subdomain = searchParams.get('store') ?? extractSubdomain(req.headers.get('host') ?? '');

  const requestHeaders = new Headers(req.headers);
  if (subdomain) {
    requestHeaders.set('x-store-subdomain', subdomain);
  } else {
    requestHeaders.delete('x-store-subdomain');
  }
  const res = NextResponse.next({ request: { headers: requestHeaders } });

  const current = req.cookies.get('store-subdomain')?.value;
  if (subdomain) {
    if (current !== subdomain) {
      res.cookies.set('store-subdomain', subdomain, { path: '/', sameSite: 'lax' });
    }
  } else if (current) {
    res.cookies.delete('store-subdomain');
  }

  return res;
}

function redirect(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  // Run on all pages (subdomain + auth), skip Next internals and the API.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

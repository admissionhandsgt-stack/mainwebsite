import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { 
  isAdminSubdomain, 
  isProdFrontend, 
  isUatFrontend, 
  getAdminRedirectUrl 
} from './utils/envHelper';

// Mirrors SESSION_COOKIE in src/lib/auth.ts. Middleware runs on the edge and
// cannot import that module — it pulls in the Postgres driver.
const SESSION_COOKIE = 'ah_admin_session';

/**
 * Bounces a signed-out visitor to the login page.
 *
 * This only checks that a session cookie is *present*; the cookie is validated
 * against `admin_sessions` in `requireAdmin`, which every admin API route
 * calls. So this is a redirect for the signed-out, not the access control —
 * forging a cookie value gets you an empty page shell and 401s from every
 * endpoint behind it.
 */
/**
 * An absolute URL on the host the visitor actually used.
 *
 * `req.nextUrl` carries the address this process was reached on — behind the
 * reverse proxy that is `localhost:8120`, so a redirect built from it sent
 * people to a host that only exists inside the server.
 */
function externalUrl(hostname: string, pathname: string) {
  /**
   * The scheme is decided by the host, not by a header.
   *
   * `X-Forwarded-Proto` is not trustworthy here: Caddy is configured not to
   * pass the client's scheme through (it makes Next treat internal rewrites as
   * cross-origin), and what does arrive reports the *upstream* connection,
   * which is plain HTTP. Redirects built from it sent people to http:// on a
   * host that only serves https.
   *
   * Every real host is behind TLS-terminating Caddy; only local development is
   * plain HTTP. That is deterministic and needs no header.
   */
  const clean = hostname.split(':')[0].toLowerCase();
  const local =
    clean === 'localhost' || clean.startsWith('127.') || clean.endsWith('.local');
  return `${local ? 'http' : 'https'}://${hostname}${pathname}`;
}

function requireSessionCookie(
  req: NextRequest,
  hostname: string,
  loginPath: string,
) {
  if (req.cookies.get(SESSION_COOKIE)?.value) return null;
  return NextResponse.redirect(externalUrl(hostname, loginPath));
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const hostname =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    url.hostname;


  // 1. Handle admin subdomain requests (e.g., admin.admissionhands.com, admin-uat.admissionhands.com)
  if (isAdminSubdomain(hostname)) {
    /**
     * The rewrite below re-enters this middleware with the new path, so
     * everything here has to be idempotent. Without this guard the second pass
     * saw a path starting with /admin, applied the "strip the prefix" rule
     * meant for hand-typed URLs, redirected to / — and looped until the
     * browser gave up at fifty redirects.
     *
     * A request header is the only thing that survives a rewrite into the next
     * pass; a response header would not be visible.
     */
    if (req.headers.get('x-ah-admin-rewritten') === '1') {
      return NextResponse.next();
    }

    // A hand-typed admin.admissionhands.com/admin/contacts becomes /contacts,
    // so the subdomain never shows the prefix it already implies.
    if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
      const newPath = url.pathname.replace(/^\/admin/, '') || '/';
      return NextResponse.redirect(externalUrl(hostname, newPath));
    }

    // The login page itself must stay reachable while signed out.
    if (url.pathname !== '/') {
      const bounce = requireSessionCookie(req, hostname, '/');
      if (bounce) return bounce;
    }

    /**
     * Rewrite internally to the /admin route structure.
     *
     * Caddy is told not to forward `X-Forwarded-Proto` to this app. With it,
     * Next builds request URLs as `https://localhost:8120/...` while the
     * server listens on plain HTTP, decides the rewrite is cross-origin, and
     * tries to proxy it over TLS to a port that speaks none — EPROTO, and a
     * 500 on every admin page. The proto is not lost: `externalUrl` defaults
     * to https, so redirects the visitor follows are still https.
     */
    const headers = new Headers(req.headers);
    headers.set('x-ah-admin-rewritten', '1');
    url.pathname = `/admin${url.pathname}`;
    return NextResponse.rewrite(url, { request: { headers } });
  }

  // 2. Handle /admin path requests on main domains (production)
  if (url.pathname.startsWith('/admin')) {
    if (isProdFrontend(hostname)) {
      const redirectTarget = getAdminRedirectUrl(hostname, url.pathname);
      return NextResponse.redirect(new URL(redirectTarget, req.url));
    }

    // Inline admin (localhost, *.workers.dev, UAT): /admin is the login page.
    if (url.pathname !== '/admin') {
      const bounce = requireSessionCookie(req, hostname, '/admin');
      if (bounce) return bounce;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|assets|images|favicon.ico|logo.png|robots.txt|sitemap.xml).*)',
  ],
};
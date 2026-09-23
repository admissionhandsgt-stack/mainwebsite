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
function requireSessionCookie(req: NextRequest, loginPath: string) {
  if (req.cookies.get(SESSION_COOKIE)?.value) return null;
  const login = req.nextUrl.clone();
  login.pathname = loginPath;
  login.search = '';
  return NextResponse.redirect(login);
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  // Using url.hostname (derived by Next.js from request) to avoid host header resolution issues
  const hostname = url.hostname;

  console.log(`[Middleware] Path: ${url.pathname} | Hostname: ${hostname}`);

  // 1. Handle admin subdomain requests (e.g., admin.admissionhands.com, admin-uat.admissionhands.com)
  if (isAdminSubdomain(hostname)) {
    // If the path already starts with /admin, redirect to clean path on the same host
    // e.g., admin.admissionhands.com/admin/contacts -> admin.admissionhands.com/contacts
    if (url.pathname.startsWith('/admin')) {
      const newPath = url.pathname.replace(/^\/admin/, '') || '/';
      url.pathname = newPath;
      return NextResponse.redirect(url);
    }

    // The login page itself must stay reachable while signed out.
    if (url.pathname !== '/') {
      const bounce = requireSessionCookie(req, '/');
      if (bounce) return bounce;
    }

    // Rewrite internally to the /admin route structure
    url.pathname = `/admin${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // 2. Handle /admin path requests on main domains (production)
  if (url.pathname.startsWith('/admin')) {
    if (isProdFrontend(hostname)) {
      const redirectTarget = getAdminRedirectUrl(hostname, url.pathname);
      return NextResponse.redirect(new URL(redirectTarget, req.url));
    }

    // Inline admin (localhost, *.workers.dev, UAT): /admin is the login page.
    if (url.pathname !== '/admin') {
      const bounce = requireSessionCookie(req, '/admin');
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
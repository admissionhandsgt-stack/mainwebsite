import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { 
  isAdminSubdomain, 
  isProdFrontend, 
  isUatFrontend, 
  getAdminRedirectUrl 
} from './utils/envHelper';

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
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|assets|images|favicon.ico|logo.png|robots.txt|sitemap.xml).*)',
  ],
};
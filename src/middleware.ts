import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const hostname = req.headers.get('host') || '';

  const isProduction = process.env.NODE_ENV === 'production';

  // Detect Cloudflare workers.dev URLs
  const isWorkersDev = hostname.includes('workers.dev');

  // Detect admin subdomain
  const isAdminSubdomain = hostname.startsWith('admin.');

  console.log(
    `[Middleware] Path: ${url.pathname} | Host: ${hostname} | IsAdminSubdomain: ${isAdminSubdomain} | IsWorkersDev: ${isWorkersDev}`
  );

  /**
   * 1. Handle admin subdomain requests
   * Example:
   * admin.admissionhands.com/colleges
   * → internally rewrites to /admin/colleges
   */
  if (isAdminSubdomain) {
    // Prevent duplicate /admin paths
    if (url.pathname.startsWith('/admin')) {
      const newPath = url.pathname.replace(/^\/admin/, '') || '/';
      url.pathname = newPath;
      return NextResponse.redirect(url);
    }

    // Rewrite to admin route structure
    url.pathname = `/admin${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  /**
   * 2. Redirect production /admin URLs to admin subdomain
   *
   * Example:
   * admissionhands.com/admin/colleges
   * → admin.admissionhands.com/colleges
   *
   * BUT:
   * workers.dev URLs should NOT redirect
   * so we can test admin in UAT.
   */
  if (
    url.pathname.startsWith('/admin') &&
    isProduction &&
    !isWorkersDev
  ) {
    const targetHost = 'admin.admissionhands.com';
    const targetPath = url.pathname.replace(/^\/admin/, '') || '/';

    return NextResponse.redirect(
      new URL(`https://${targetHost}${targetPath}`, req.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|assets|images|favicon.ico|logo.png|robots.txt|sitemap.xml).*)',
  ],
};
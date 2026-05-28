import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const hostname = req.headers.get('host') || '';

  const isProduction = process.env.NODE_ENV === 'production';
  
  // Detect if the request is for the admin subdomain
  const isAdminSubdomain = hostname.startsWith('admin.admissionhands.com') || hostname.startsWith('admin.localhost');

  // 1. If accessing via the admin subdomain
  if (isAdminSubdomain) {
    // If the path already starts with /admin, redirect to the stripped path to keep URLs clean
    // e.g., admin.admissionhands.com/admin/contacts -> admin.admissionhands.com/contacts
    if (url.pathname.startsWith('/admin')) {
      const newPath = url.pathname.replace(/^\/admin/, '') || '/';
      url.pathname = newPath;
      return NextResponse.redirect(url);
    }

    // Rewrite the request internally to map to the /admin route folder structure
    url.pathname = `/admin${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // 2. If accessing the main domain but requesting the /admin path on production, redirect to the subdomain
  if (url.pathname.startsWith('/admin') && isProduction) {
    const targetHost = 'admin.admissionhands.com';
    const targetPath = url.pathname.replace(/^\/admin/, '') || '/';
    return NextResponse.redirect(new URL(`https://${targetHost}${targetPath}`, req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on all paths except static assets, API routes, and public files
  matcher: [
    '/((?!api|_next/static|_next/image|assets|images|favicon.ico|logo.png|robots.txt|sitemap.xml).*)',
  ],
};

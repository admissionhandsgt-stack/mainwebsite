import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Authentication is handled client-side by ProtectedRoute.tsx
  // Supabase uses localStorage by default, so server-side cookie checks will fail.
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};

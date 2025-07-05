import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // For now, let all requests pass through
  // Authentication will be handled client-side with Firebase Auth
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/events/:path*',
    '/profile/:path*',
    '/auth/:path*',
  ],
};

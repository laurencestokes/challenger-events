import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/signin', '/'];

  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // For protected routes, we'll let the client-side handle authentication
  // Firebase Auth handles this better on the client side
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

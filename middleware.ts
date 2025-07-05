import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Allow all API routes to pass through
  if (path.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Allow static files and public assets
  if (path.startsWith('/_next/') || path.startsWith('/favicon') || path.includes('.')) {
    return NextResponse.next();
  }

  // Handle authentication routes
  if (path.startsWith('/auth/')) {
    return NextResponse.next();
  }

  // Handle public routes
  if (
    path === '/' ||
    path === '/about' ||
    path === '/formula' ||
    path === '/showdown' ||
    path === '/data' ||
    path === '/mock'
  ) {
    return NextResponse.next();
  }

  // For protected routes, let the client-side auth handle it
  // This prevents 404s but allows the ProtectedRoute component to handle auth
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

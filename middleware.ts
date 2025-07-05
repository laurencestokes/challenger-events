import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
    function middleware(req) {
        const { pathname } = req.nextUrl
        const { token } = req.nextauth

        // Public routes that don't require authentication
        const publicRoutes = ['/auth/signin', '/auth/verify-request']

        if (publicRoutes.includes(pathname)) {
            return NextResponse.next()
        }

        // Admin-only routes
        const adminRoutes = ['/admin']
        if (adminRoutes.some(route => pathname.startsWith(route))) {
            if (!token?.role || (token.role !== 'ADMIN' && token.role !== 'SUPER_ADMIN')) {
                return NextResponse.redirect(new URL('/dashboard', req.url))
            }
        }

        return NextResponse.next()
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token
        }
    }
)

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/admin/:path*',
        '/events/:path*',
        '/profile/:path*',
        '/auth/:path*'
    ]
} 
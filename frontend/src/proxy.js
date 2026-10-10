/**
 * VeriGold — Next.js Route Proxy (formerly middleware, renamed in Next.js 16)
 *
 * Protects all /dashboard/* and /admin/* routes.
 * Unauthenticated users (no vg_token cookie) are redirected to /auth.
 *
 * Auth token is stored as a cookie named `vg_token`. The proxy reads only
 * cookie presence — full JWT validation happens server-side on the backend.
 */

import { NextResponse } from 'next/server';

/** Routes that require authentication. */
const PROTECTED_PREFIXES = ['/dashboard', '/admin'];

export default function proxy(request) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get('vg_token')?.value;

  if (!token) {
    const loginUrl = new URL('/auth', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Skip proxy for static assets and Next.js internals.
   * Apply only to page routes that match our protected prefixes.
   */
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};

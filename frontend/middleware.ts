import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Bypass Next.js internals, static files, and assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // 2. Check for active session / auth token in cookies
  const cookies = request.cookies.getAll();
  const isAuthenticated = cookies.some(
    (c) =>
      (c.name === 'scipal_session' && c.value === 'active') ||
      c.name.startsWith('sb-') ||
      c.name.includes('auth-token'),
  );

  const isLoginPage = pathname === '/login';

  // 3. If authenticated and trying to access /login, redirect to Home
  if (isLoginPage && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 4. If NOT authenticated and trying to access any protected page, force redirect to /login
  if (!isAuthenticated && !isLoginPage) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images, and public files with extensions
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

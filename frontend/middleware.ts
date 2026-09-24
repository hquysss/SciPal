import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@scipal/supabase';

function isProtectedPath(pathname: string) {
  return (
    pathname === '/profile' ||
    pathname.startsWith('/profile/') ||
    pathname === '/progress' ||
    pathname.startsWith('/progress/') ||
    pathname === '/teacher' ||
    pathname.startsWith('/teacher/') ||
    pathname.startsWith('/exam/')
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Lessons, the glossary, exam list, and home are public content.
  if (!isProtectedPath(pathname)) return NextResponse.next();

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search);

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.redirect(loginUrl);
  }

  const cookieUpdates: Array<{
    name: string;
    value: string;
    options: Parameters<NextResponse['cookies']['set']>[2];
  }> = [];
  const supabase = createServerClient({
    getAll: () => request.cookies.getAll(),
    set: (name: string, value: string, options: Parameters<NextResponse['cookies']['set']>[2]) => {
      request.cookies.set(name, value);
      cookieUpdates.push({ name, value, options });
    },
  });

  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error) user = data.user;
  } catch {
    // A failed auth service cannot turn an unverified cookie into a session.
  }

  let response: NextResponse;
  if (!user) {
    response = NextResponse.redirect(loginUrl);
  } else if (
    (pathname === '/teacher' || pathname.startsWith('/teacher/')) &&
    !['teacher', 'admin'].includes(user.app_metadata?.app_role)
  ) {
    response = NextResponse.redirect(new URL('/profile', request.url));
  } else {
    response = NextResponse.next({ request });
  }

  for (const { name, value, options } of cookieUpdates) {
    response.cookies.set(name, value, options);
  }
  return response;
}

export const config = {
  matcher: ['/profile/:path*', '/progress/:path*', '/teacher/:path*', '/exam/:path+'],
};

import { NextResponse } from 'next/server';

export default function proxy(request) {
  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  const token = request.cookies.get('auth_token')?.value;
  const expectedToken = process.env.SECRET_CODE || 'mypostmanisthebestintheworld';

  if (!token && !isAuthPage) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      if (!request.nextUrl.pathname.startsWith('/api/auth')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  if (token === expectedToken && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

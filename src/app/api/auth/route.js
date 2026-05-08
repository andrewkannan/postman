export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { serialize } from 'cookie';

export async function POST(request) {
  try {
    const { code } = await request.json();
    const expectedCode = process.env.SECRET_CODE || 'mypostmanisthebestintheworld';

    if (code === expectedCode) {
      const cookie = serialize('auth_token', code, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
      });

      const response = NextResponse.json({ success: true });
      response.headers.set('Set-Cookie', cookie);
      return response;
    }

    return NextResponse.json({ success: false, error: 'Invalid secret code' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Bad request' }, { status: 400 });
  }
}

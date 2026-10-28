import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, USER_COOKIE_NAME, generateUserSessionToken, getSessionCookieOptions } from '@/lib/authCrypto';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const { password: _, ...safeUser } = user;
    const token = generateUserSessionToken(user.id, user.email, user.role);
    const response = NextResponse.json({
      authenticated: true,
      user: safeUser,
      token
    });
    response.cookies.set(USER_COOKIE_NAME, token, getSessionCookieOptions());
    return response;
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_')) throw err;
    console.error('API /api/auth/me error:', err);
    return NextResponse.json({ authenticated: false, error: 'Verification error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest, ADMIN_COOKIE_NAME, generateAdminSessionToken, getSessionCookieOptions } from '@/lib/authCrypto';

export async function GET(request: NextRequest) {
  try {
    const adminUser = await getAdminFromRequest(request);
    if (!adminUser) {
      return NextResponse.json(
        { authenticated: false, error: 'Unauthorized: Valid Super Admin session required.' },
        { status: 401 }
      );
    }

    const { password: _, ...safeAdmin } = adminUser;
    const response = NextResponse.json({
      authenticated: true,
      admin: safeAdmin
    });

    // Refresh admin session cookie
    const token = generateAdminSessionToken(adminUser.id, adminUser.email);
    response.cookies.set(ADMIN_COOKIE_NAME, token, getSessionCookieOptions());

    return response;
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_')) throw err;
    console.error('API /api/admin/auth/verify error:', err);
    return NextResponse.json({ authenticated: false, error: 'Verification error' }, { status: 500 });
  }
}

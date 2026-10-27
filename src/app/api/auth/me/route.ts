import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/authCrypto';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const { password: _, ...safeUser } = user;
    return NextResponse.json({
      authenticated: true,
      user: safeUser
    });
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_')) throw err;
    console.error('API /api/auth/me error:', err);
    return NextResponse.json({ authenticated: false, error: 'Verification error' }, { status: 500 });
  }
}

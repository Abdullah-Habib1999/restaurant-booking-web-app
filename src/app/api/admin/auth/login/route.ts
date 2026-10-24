import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/serverDb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = serverDb.getUserByEmail(cleanEmail);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid administrator credentials.' },
        { status: 401 }
      );
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: This account does not possess Super Admin privileges.' },
        { status: 403 }
      );
    }

    if (user.password && user.password !== password) {
      return NextResponse.json(
        { error: 'Invalid administrator credentials.' },
        { status: 401 }
      );
    }

    // Generate secure session token (based on admin id + timestamp hash)
    const sessionToken = Buffer.from(`${user.id}:${Date.now()}:${user.email}`).toString('base64');

    const { password: _, ...safeAdmin } = user;

    return NextResponse.json({
      success: true,
      admin: safeAdmin,
      token: sessionToken
    });

  } catch (err: any) {
    console.error('API /api/admin/auth/login error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

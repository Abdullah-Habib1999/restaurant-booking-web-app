import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/serverDb';

export async function GET(request: NextRequest) {
  try {
    const adminId = request.headers.get('x-admin-user-id');
    if (!adminId) {
      return NextResponse.json({ authenticated: false, error: 'No admin session provided.' }, { status: 401 });
    }

    const user = serverDb.getUserById(adminId);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ authenticated: false, error: 'Invalid admin credentials or role.' }, { status: 403 });
    }

    const { password: _, ...safeAdmin } = user;
    return NextResponse.json({
      authenticated: true,
      admin: safeAdmin
    });
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_')) throw err;
    console.error('API /api/admin/auth/verify error:', err);
    return NextResponse.json({ authenticated: false, error: 'Verification error' }, { status: 500 });
  }
}

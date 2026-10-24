import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/serverDb';

export async function GET(request: NextRequest) {
  try {
    const adminId = request.headers.get('x-admin-user-id');
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
    }

    const adminUser = serverDb.getUserById(adminId);
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Super Admin privileges required.' }, { status: 403 });
    }

    const stats = serverDb.getAdminStats();
    return NextResponse.json(stats);
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_')) throw err;
    console.error('API /api/admin/stats error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

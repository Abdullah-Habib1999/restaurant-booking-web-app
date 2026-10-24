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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const restaurants = serverDb.getAdminRestaurants({ status, search });
    return NextResponse.json(restaurants);
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_')) throw err;
    console.error('API /api/admin/restaurants error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

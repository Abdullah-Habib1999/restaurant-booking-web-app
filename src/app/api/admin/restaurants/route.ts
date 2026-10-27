import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/serverDb';
import { getAdminFromRequest } from '@/lib/authCrypto';

export async function GET(request: NextRequest) {
  try {
    const adminUser = await getAdminFromRequest(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized: Super Admin authentication required.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const restaurants = await serverDb.getAdminRestaurants({ status, search });
    return NextResponse.json(restaurants);
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_')) throw err;
    console.error('API /api/admin/restaurants error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

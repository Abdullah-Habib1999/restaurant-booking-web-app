import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/serverDb';
import { getAdminFromRequest } from '@/lib/authCrypto';

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getAdminFromRequest(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized: Super Admin authentication required.' }, { status: 401 });
    }

    const body = await request.json();
    const { restaurantId, reason } = body;

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required.' }, { status: 400 });
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return NextResponse.json({ error: 'A specific rejection reason (minimum 5 characters) is required to guide the restaurant partner.' }, { status: 400 });
    }

    const restaurant = await serverDb.getRestaurantById(restaurantId);
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found.' }, { status: 404 });
    }

    const cleanReason = reason.trim();
    const updated = await serverDb.updateRestaurantApprovalStatus(restaurantId, 'rejected', {
      reason: cleanReason,
      adminId: adminUser.id
    });

    return NextResponse.json({
      success: true,
      message: `Registration for "${restaurant.name}" was rejected.`,
      restaurant: updated
    });
  } catch (err: any) {
    console.error('API /api/admin/restaurants/reject error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

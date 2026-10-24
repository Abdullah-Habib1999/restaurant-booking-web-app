import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/serverDb';

export async function POST(request: NextRequest) {
  try {
    const adminId = request.headers.get('x-admin-user-id');
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
    }

    const adminUser = serverDb.getUserById(adminId);
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Super Admin privileges required.' }, { status: 403 });
    }

    const body = await request.json();
    const { restaurantId, reason } = body;

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required.' }, { status: 400 });
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return NextResponse.json({ error: 'A specific rejection reason (minimum 5 characters) is required to guide the restaurant partner.' }, { status: 400 });
    }

    const restaurant = serverDb.getRestaurantById(restaurantId);
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found.' }, { status: 404 });
    }

    const cleanReason = reason.trim();
    const updated = serverDb.updateRestaurantApprovalStatus(restaurantId, 'rejected', {
      rejectionReason: cleanReason,
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

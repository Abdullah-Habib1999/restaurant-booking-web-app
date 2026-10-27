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
    const { restaurantId } = body;

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required.' }, { status: 400 });
    }

    const restaurant = await serverDb.getRestaurantById(restaurantId);
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found.' }, { status: 404 });
    }

    // Update status to 'published' and stamp admin review
    const updated = await serverDb.updateRestaurantApprovalStatus(restaurantId, 'published', {
      adminId: adminUser.id
    });

    return NextResponse.json({
      success: true,
      message: `"${restaurant.name}" has been approved and published to diners.`,
      restaurant: updated
    });
  } catch (err: any) {
    console.error('API /api/admin/restaurants/approve error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

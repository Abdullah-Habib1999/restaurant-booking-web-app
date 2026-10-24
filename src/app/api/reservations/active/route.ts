import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/serverDb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const customerId = searchParams.get('customerId');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!restaurantId || !customerId) {
      return NextResponse.json({ error: 'restaurantId and customerId are required' }, { status: 400 });
    }

    const activeBooking = serverDb.getActiveBookingForCustomer(restaurantId, customerId, date);
    return NextResponse.json({ activeBooking });
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_')) throw err;
    console.error('API /api/reservations/active GET error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/serverDb';

// GET: Returns real-time table & seat map availability for a specific restaurant, date, and time
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const date = searchParams.get('date');
    const time = searchParams.get('time');
    const partySizeStr = searchParams.get('partySize');

    if (!restaurantId || !date || !time) {
      return NextResponse.json({ error: 'restaurantId, date, and time are required' }, { status: 400 });
    }

    const partySize = partySizeStr ? parseInt(partySizeStr, 10) : 2;
    const tables = await serverDb.getTableSeatsAvailability(restaurantId, date, time, partySize);

    return NextResponse.json({ tables });
  } catch (err: any) {
    console.error('API /api/seats GET error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Manage temporary seat holds (hold or release) like cinema bookings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, restaurantId, date, time, tableId, seatNumbers, holdToken, durationMinutes } = body;

    if (action === 'hold') {
      if (!restaurantId || !date || !time || !tableId) {
        return NextResponse.json({ error: 'restaurantId, date, time, and tableId are required' }, { status: 400 });
      }

      const result = serverDb.holdSeats({
        restaurantId,
        date,
        time,
        tableId,
        seatNumbers,
        holdDurationMinutes: durationMinutes || 10
      });

      if (!result.success) {
        return NextResponse.json(result, { status: 409 });
      }
      return NextResponse.json(result);
    }

    if (action === 'release') {
      serverDb.releaseHold(restaurantId, date, time, tableId, holdToken);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
  } catch (err: any) {
    console.error('API /api/seats POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

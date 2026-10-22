import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/serverDb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const date = searchParams.get('date');
    const partySizeStr = searchParams.get('partySize');

    if (!restaurantId || !date) {
      return NextResponse.json({ error: 'restaurantId and date are required parameters' }, { status: 400 });
    }

    const partySize = partySizeStr ? parseInt(partySizeStr, 10) : 2;
    const slots = serverDb.checkSlotAvailability(restaurantId, date, partySize);

    return NextResponse.json(slots);
  } catch (err: any) {
    console.error('API /api/slots GET error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

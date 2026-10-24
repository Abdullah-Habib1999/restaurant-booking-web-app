import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/serverDb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const date = searchParams.get('date');
    const partySizeStr = searchParams.get('partySize');

    if (!restaurantId || !date) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'restaurantId and date are required parameters',
          slots: [] 
        }, 
        { status: 400 }
      );
    }

    const partySize = partySizeStr ? parseInt(partySizeStr, 10) : 2;
    const details = serverDb.getSlotAvailabilityDetails(restaurantId, date, partySize);

    return NextResponse.json(details);
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_')) throw err;
    console.error('API /api/slots GET error:', err);
    return NextResponse.json(
      { 
        status: 'error', 
        message: err.message || 'Internal Server Error',
        slots: [] 
      }, 
      { status: 500 }
    );
  }
}

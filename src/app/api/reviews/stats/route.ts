import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/serverDb';

// GET /api/reviews/stats?restaurantId=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    const stats = await serverDb.getReviewStats(restaurantId);
    return NextResponse.json(stats);
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_')) throw err;
    console.error('API /api/reviews/stats GET error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

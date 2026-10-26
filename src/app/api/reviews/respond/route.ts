import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/serverDb';

// POST /api/reviews/respond (Owner responses)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reviewId, ownerId, response } = body;

    if (!reviewId || !ownerId || !response) {
      return NextResponse.json(
        { success: false, error: 'Review ID, Owner ID, and Response text are required.' },
        { status: 400 }
      );
    }

    const result = await serverDb.respondToReview(reviewId, ownerId, response);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('API /api/reviews/respond POST error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

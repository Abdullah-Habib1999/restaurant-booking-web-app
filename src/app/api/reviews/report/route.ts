import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/serverDb';

// POST /api/reviews/report (Flag/report inappropriate reviews)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reviewId, reporterId, reason } = body;

    if (!reviewId || !reason) {
      return NextResponse.json(
        { success: false, error: 'Review ID and reason are required.' },
        { status: 400 }
      );
    }

    const result = await serverDb.reportReview(reviewId, reporterId || 'anonymous', reason);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('API /api/reviews/report POST error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

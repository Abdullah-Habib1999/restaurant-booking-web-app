import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/serverDb';

// GET /api/reviews?restaurantId=...&customerId=...&reservationId=...&sortBy=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId') || undefined;
    const customerId = searchParams.get('customerId') || undefined;
    const sortBy = (searchParams.get('sortBy') as 'recent' | 'highest' | 'lowest') || 'recent';

    const reviews = await serverDb.getReviews({
      restaurantId,
      customerId,
      sort: sortBy
    });

    return NextResponse.json(reviews);
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_')) throw err;
    console.error('API /api/reviews GET error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/reviews (Create Review)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      restaurantId,
      customerId,
      customerName,
      customerEmail,
      reservationId,
      overallRating,
      foodRating,
      serviceRating,
      ambienceRating,
      valueRating,
      comment,
      tags
    } = body;

    if (!restaurantId || !customerId || !reservationId || !overallRating) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID, Customer ID, Reservation ID, and Overall Rating are required.' },
        { status: 400 }
      );
    }

    const result = await serverDb.createReview({
      restaurantId,
      customerId,
      customerName,
      customerEmail,
      reservationId,
      overallRating: Number(overallRating),
      foodRating: foodRating !== undefined ? Number(foodRating) : undefined,
      serviceRating: serviceRating !== undefined ? Number(serviceRating) : undefined,
      ambienceRating: ambienceRating !== undefined ? Number(ambienceRating) : undefined,
      valueRating: valueRating !== undefined ? Number(valueRating) : undefined,
      comment,
      tags
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    console.error('API /api/reviews POST error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/reviews (Update Customer's Own Review)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      customerId,
      overallRating,
      foodRating,
      serviceRating,
      ambienceRating,
      valueRating,
      comment,
      tags
    } = body;

    if (!id || !customerId) {
      return NextResponse.json({ success: false, error: 'Review ID and Customer ID are required.' }, { status: 400 });
    }

    const result = await serverDb.updateReview(id, customerId, {
      overallRating: overallRating !== undefined ? Number(overallRating) : undefined,
      foodRating: foodRating !== undefined ? Number(foodRating) : undefined,
      serviceRating: serviceRating !== undefined ? Number(serviceRating) : undefined,
      ambienceRating: ambienceRating !== undefined ? Number(ambienceRating) : undefined,
      valueRating: valueRating !== undefined ? Number(valueRating) : undefined,
      comment,
      tags
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('API /api/reviews PATCH error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/reviews?id=...&customerId=...
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const customerId = searchParams.get('customerId');

    if (!id || !customerId) {
      return NextResponse.json({ success: false, error: 'Review ID and Customer ID are required.' }, { status: 400 });
    }

    const result = await serverDb.deleteReview(id, customerId);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('API /api/reviews DELETE error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

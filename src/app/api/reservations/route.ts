import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/serverDb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId') || undefined;
    const customerId = searchParams.get('customerId') || undefined;
    const id = searchParams.get('id');

    if (id) {
      const res = await serverDb.getReservationById(id);
      if (!res) return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
      return NextResponse.json(res);
    }

    const reservations = await serverDb.getReservations({ restaurantId, customerId });
    return NextResponse.json(reservations);
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_')) throw err;
    console.error('API /api/reservations GET error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await serverDb.createReservation(body);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    console.error('API /api/reservations POST error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, cancellationReason, assignedTableId } = body;

    if (!id) {
      return NextResponse.json({ error: 'Reservation ID is required' }, { status: 400 });
    }

    let updated = null;

    if (status) {
      updated = await serverDb.updateReservationStatus(id, status, cancellationReason);
    }

    if (assignedTableId) {
      updated = await serverDb.assignReservationTable(id, assignedTableId);
    }

    if (!updated) {
      return NextResponse.json({ error: 'Reservation not found or update failed' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('API /api/reservations PATCH error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

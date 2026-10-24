import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/serverDb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const id = searchParams.get('id');

    if (slug) {
      const rest = serverDb.getRestaurantBySlug(slug);
      if (!rest) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(rest);
    }

    if (id) {
      const rest = serverDb.getRestaurantById(id);
      if (!rest) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(rest);
    }

    const restaurants = serverDb.getRestaurants();
    return NextResponse.json(restaurants);
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_')) throw err;
    console.error('API /api/restaurants GET error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const saved = serverDb.saveRestaurant(body);
    return NextResponse.json(saved);
  } catch (err: any) {
    console.error('API /api/restaurants POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

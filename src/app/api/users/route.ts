import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/serverDb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const id = searchParams.get('id');

    if (email) {
      const user = serverDb.getUserByEmail(email);
      return NextResponse.json(user || null);
    }

    if (id) {
      const user = serverDb.getUserById(id);
      return NextResponse.json(user || null);
    }

    const users = serverDb.getUsers();
    return NextResponse.json(users);
  } catch (err: any) {
    console.error('API /api/users GET error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const saved = serverDb.saveUser(body);
    return NextResponse.json(saved);
  } catch (err: any) {
    console.error('API /api/users POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

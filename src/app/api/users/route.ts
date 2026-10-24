import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/serverDb';
import { UserProfile } from '@/types';

function sanitizeUser(user: UserProfile | null): Omit<UserProfile, 'password'> | null {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const id = searchParams.get('id');

    if (email) {
      const user = serverDb.getUserByEmail(email);
      return NextResponse.json(sanitizeUser(user));
    }

    if (id) {
      const user = serverDb.getUserById(id);
      return NextResponse.json(sanitizeUser(user));
    }

    const adminId = request.headers.get('x-admin-user-id');
    const adminUser = adminId ? serverDb.getUserById(adminId) : null;
    
    // Only admins can enumerate all users
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized user listing.' }, { status: 403 });
    }

    const users = serverDb.getUsers().map(sanitizeUser);
    return NextResponse.json(users);
  } catch (err: any) {
    console.error('API /api/users GET error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Prevent unauthorized creation or elevation to 'admin' role
    if (body.role === 'admin') {
      const adminId = request.headers.get('x-admin-user-id');
      const adminUser = adminId ? serverDb.getUserById(adminId) : null;
      if (!adminUser || adminUser.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden: Admin accounts can only be created via the Super Admin Setup process.' },
          { status: 403 }
        );
      }
    }

    const saved = serverDb.saveUser(body);
    return NextResponse.json(sanitizeUser(saved));
  } catch (err: any) {
    console.error('API /api/users POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}


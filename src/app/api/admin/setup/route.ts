import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/serverDb';
import { UserProfile } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, email, password, bootstrapSecret } = body;

    const hasAdmin = serverDb.hasAnyAdmin();
    const serverBootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET;

    // 1. One-time setup enforcement:
    // If an admin already exists, lockdown setup. It can only be re-invoked if the exact server-side
    // ADMIN_BOOTSTRAP_SECRET is provided.
    if (hasAdmin) {
      if (!serverBootstrapSecret || bootstrapSecret !== serverBootstrapSecret) {
        return NextResponse.json(
          { 
            error: 'Super Admin setup is locked. An administrator account already exists. For security, setup cannot be repeated.' 
          }, 
          { status: 403 }
        );
      }
    }

    // 2. Validate server-side bootstrap secret if configured in environment
    if (serverBootstrapSecret) {
      if (!bootstrapSecret || bootstrapSecret !== serverBootstrapSecret) {
        return NextResponse.json(
          { error: 'Invalid bootstrap secret key. Verification failed.' },
          { status: 401 }
        );
      }
    }

    // 3. Strict field validation
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return NextResponse.json(
        { error: 'A valid full name (minimum 2 characters) is required.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Administrator password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    // Check if user already exists
    const existingUser = serverDb.getUserByEmail(cleanEmail);
    let adminUser: UserProfile;

    if (existingUser) {
      // Elevate existing account to admin with updated credentials
      adminUser = {
        ...existingUser,
        fullName: cleanName,
        role: 'admin',
        password: password
      };
      serverDb.saveUser(adminUser);
    } else {
      adminUser = {
        id: `admin-${Date.now()}`,
        email: cleanEmail,
        fullName: cleanName,
        role: 'admin',
        password: password,
        createdAt: new Date().toISOString()
      };
      serverDb.saveUser(adminUser);
    }

    // Sanitize response: never return password to client
    const { password: _, ...safeAdmin } = adminUser;

    return NextResponse.json({
      success: true,
      message: 'Super Admin account successfully initialized.',
      admin: safeAdmin
    }, { status: 201 });

  } catch (err: any) {
    console.error('API /api/admin/setup error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/serverDb';
import { verifyPassword, isLegacyPlainText, hashPassword, generateAdminSessionToken } from '@/lib/authCrypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    // Check if any admin exists in persistent database
    const hasAdmin = await serverDb.hasAnyAdmin();

    if (!hasAdmin) {
      return NextResponse.json(
        { 
          error: 'No Super Administrator has been initialized on this instance yet. Please visit /admin/setup to complete initial setup, or configure ADMIN_INITIAL_EMAIL and ADMIN_INITIAL_PASSWORD in environment variables.',
          needsSetup: true
        },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await serverDb.getUserByEmail(cleanEmail);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid administrator credentials.' },
        { status: 401 }
      );
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: This account does not possess Super Admin privileges.' },
        { status: 403 }
      );
    }

    const isMatch = await verifyPassword(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid administrator credentials.' },
        { status: 401 }
      );
    }

    // If password was stored in legacy plain-text format, seamlessly upgrade to scrypt hash on login
    if (user.password && isLegacyPlainText(user.password)) {
      try {
        const upgradedHash = await hashPassword(password);
        user.password = upgradedHash;
        await serverDb.saveUser(user);
      } catch (upgradeErr) {
        console.warn('Password hash upgrade warning:', upgradeErr);
      }
    }

    // Generate secure session token
    const sessionToken = generateAdminSessionToken(user.id, user.email);

    const { password: _, ...safeAdmin } = user;

    return NextResponse.json({
      success: true,
      admin: safeAdmin,
      token: sessionToken
    });

  } catch (err: any) {
    console.error('API /api/admin/auth/login error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

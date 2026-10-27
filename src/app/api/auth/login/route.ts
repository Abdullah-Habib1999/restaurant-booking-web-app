import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/serverDb';
import { 
  verifyPassword, 
  isLegacyPlainText, 
  hashPassword, 
  generateUserSessionToken,
  USER_COOKIE_NAME,
  getSessionCookieOptions 
} from '@/lib/authCrypto';

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

    const cleanEmail = email.trim().toLowerCase();
    const user = await serverDb.getUserByEmail(cleanEmail);

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email address.' },
        { status: 401 }
      );
    }

    const isMatch = await verifyPassword(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Incorrect password entered. Please try again.' },
        { status: 401 }
      );
    }

    // If password was stored in legacy plain-text, upgrade to scrypt hash in MongoDB Atlas
    if (user.password && isLegacyPlainText(user.password)) {
      try {
        const upgradedHash = await hashPassword(password);
        user.password = upgradedHash;
        await serverDb.saveUser(user);
      } catch (upgradeErr) {
        console.warn('User password hash upgrade warning:', upgradeErr);
      }
    }

    // Generate secure session token
    const sessionToken = generateUserSessionToken(user.id, user.email, user.role);
    const { password: _, ...safeUser } = user;

    const response = NextResponse.json({
      success: true,
      user: safeUser,
      token: sessionToken
    });

    // Set secure HTTP-only session cookie
    response.cookies.set(USER_COOKIE_NAME, sessionToken, getSessionCookieOptions());

    return response;
  } catch (err: any) {
    console.error('API /api/auth/login error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

import crypto from 'crypto';

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const SCRYPT_OPTIONS: crypto.ScryptOptions = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024
};

/**
 * Hashes a plain-text password using Node.js crypto.scrypt with a secure random salt.
 * Produces format: scrypt$<saltHex>$<derivedKeyHex>
 */
export async function hashPassword(plainText: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(SALT_LENGTH);
    crypto.scrypt(plainText, salt, KEY_LENGTH, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Securely verifies a plain-text password against a stored password string.
 * Supports:
 * 1. Modern scrypt hashes (scrypt$<salt>$<key>) with timingSafeEqual
 * 2. Legacy plain-text passwords for zero-downtime backward compatibility during migration
 */
export async function verifyPassword(
  plainText: string,
  storedPasswordOrHash?: string
): Promise<boolean> {
  if (!storedPasswordOrHash || !plainText) {
    return false;
  }

  // Modern scrypt hash
  if (storedPasswordOrHash.startsWith('scrypt$')) {
    const parts = storedPasswordOrHash.split('$');
    if (parts.length !== 3) return false;

    const saltHex = parts[1];
    const keyHex = parts[2];
    const salt = Buffer.from(saltHex, 'hex');
    const expectedKey = Buffer.from(keyHex, 'hex');

    return new Promise((resolve) => {
      crypto.scrypt(plainText, salt, KEY_LENGTH, SCRYPT_OPTIONS, (err, derivedKey) => {
        if (err) return resolve(false);
        try {
          if (derivedKey.length !== expectedKey.length) {
            return resolve(false);
          }
          const match = crypto.timingSafeEqual(derivedKey, expectedKey);
          resolve(match);
        } catch {
          resolve(false);
        }
      });
    });
  }

  // Legacy fallback comparison with timing-safe comparison to prevent timing side channels
  try {
    const a = Buffer.from(plainText);
    const b = Buffer.from(storedPasswordOrHash);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return plainText === storedPasswordOrHash;
  }
}

/**
 * Checks if a stored password string is an unhashed legacy plain text password
 */
export function isLegacyPlainText(stored?: string): boolean {
  if (!stored) return false;
  return !stored.startsWith('scrypt$');
}

/**
 * Safely decodes a session token from Cookie or Authorization header.
 * Handles URL percent-encoding (e.g. %3D), quotes, base64url, and standard base64.
 */
export function safeDecodeToken(rawToken: string): string {
  if (!rawToken) return '';
  let token = rawToken.trim();
  // Strip surrounding quotes
  if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
    token = token.slice(1, -1);
  }
  // URL decode if percent-encoded
  try {
    token = decodeURIComponent(token);
  } catch {}

  // Base64URL vs Standard Base64
  if (token.includes('-') || token.includes('_')) {
    try {
      return Buffer.from(token, 'base64url').toString('utf8');
    } catch {}
  }
  try {
    return Buffer.from(token, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

/**
 * Generates an HMAC-signed secure administrative session token using URL-safe base64url
 */
export function generateAdminSessionToken(userId: string, email: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_BOOTSTRAP_SECRET || 'tablereserve-admin-session-salt';
  const timestamp = Date.now();
  const payload = `${userId}:${email}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}:${hmac}`).toString('base64url');
}

/**
 * Verifies and parses an administrative session token
 */
export function verifyAdminSessionToken(token: string): { valid: boolean; userId?: string; email?: string } {
  try {
    const decoded = safeDecodeToken(token);
    const parts = decoded.split(':');
    if (parts.length !== 4) return { valid: false };

    const [userId, email, timestampStr, signature] = parts;
    const timestamp = Number(timestampStr);
    
    // Check reasonable expiration (7 days)
    const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
    if (isNaN(timestamp) || Date.now() - timestamp > MAX_AGE_MS) {
      return { valid: false };
    }

    const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_BOOTSTRAP_SECRET || 'tablereserve-admin-session-salt';
    const expectedPayload = `${userId}:${email}:${timestamp}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(expectedPayload).digest('hex');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: false };
    }

    return { valid: true, userId, email };
  } catch {
    return { valid: false };
  }
}

/**
 * Generates an HMAC-signed secure session token for customers and restaurant owners using URL-safe base64url
 */
export function generateUserSessionToken(userId: string, email: string, role: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET || 'tablereserve-user-session-salt';
  const timestamp = Date.now();
  const payload = `${userId}:${email}:${role}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}:${hmac}`).toString('base64url');
}

/**
 * Verifies and parses a user session token
 */
export function verifyUserSessionToken(token: string): { valid: boolean; userId?: string; email?: string; role?: string } {
  try {
    const decoded = safeDecodeToken(token);
    const parts = decoded.split(':');
    if (parts.length !== 5) return { valid: false };

    const [userId, email, role, timestampStr, signature] = parts;
    const timestamp = Number(timestampStr);

    // 7 days expiration
    const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
    if (isNaN(timestamp) || Date.now() - timestamp > MAX_AGE_MS) {
      return { valid: false };
    }

    const secret = process.env.ADMIN_SESSION_SECRET || 'tablereserve-user-session-salt';
    const expectedPayload = `${userId}:${email}:${role}:${timestamp}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(expectedPayload).digest('hex');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: false };
    }

    return { valid: true, userId, email, role };
  } catch {
    return { valid: false };
  }
}

export const ADMIN_COOKIE_NAME = 'admin_session_token';
export const USER_COOKIE_NAME = 'user_session_token';

export function getSessionCookieOptions(maxAgeSeconds = 7 * 24 * 60 * 60) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds
  };
}

/**
 * Extracts and verifies the Super Admin user from request cookies, Bearer token, or header
 */
export async function getAdminFromRequest(request: import('next/server').NextRequest): Promise<import('@/types').UserProfile | null> {
  const { serverDb } = await import('@/lib/serverDb');

  // 1. Check HTTP-only cookie
  const cookieToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (cookieToken) {
    const parsed = verifyAdminSessionToken(cookieToken);
    if (parsed.valid && parsed.userId) {
      const user = await serverDb.getUserById(parsed.userId);
      if (user && user.role === 'admin') return user;
    }
  }

  // 2. Check Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    const parsed = verifyAdminSessionToken(token);
    if (parsed.valid && parsed.userId) {
      const user = await serverDb.getUserById(parsed.userId);
      if (user && user.role === 'admin') return user;
    }
  }

  // 3. Backward-compatible fallback: explicit x-admin-user-id header
  const adminIdHeader = request.headers.get('x-admin-user-id');
  if (adminIdHeader) {
    const user = await serverDb.getUserById(adminIdHeader);
    if (user && user.role === 'admin') return user;
  }

  return null;
}

/**
 * Extracts and verifies a user (customer, owner, admin) from request cookies, Bearer token, or header
 */
export async function getUserFromRequest(request: import('next/server').NextRequest): Promise<import('@/types').UserProfile | null> {
  const { serverDb } = await import('@/lib/serverDb');

  // 1. Check user cookie
  const userCookie = request.cookies.get(USER_COOKIE_NAME)?.value;
  if (userCookie) {
    const parsed = verifyUserSessionToken(userCookie);
    if (parsed.valid && parsed.userId) {
      const user = await serverDb.getUserById(parsed.userId);
      if (user) return user;
    }
  }

  // 2. Check admin cookie if user is admin
  const adminCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (adminCookie) {
    const parsed = verifyAdminSessionToken(adminCookie);
    if (parsed.valid && parsed.userId) {
      const user = await serverDb.getUserById(parsed.userId);
      if (user) return user;
    }
  }

  // 3. Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    const userParsed = verifyUserSessionToken(token);
    if (userParsed.valid && userParsed.userId) {
      const user = await serverDb.getUserById(userParsed.userId);
      if (user) return user;
    }
    const adminParsed = verifyAdminSessionToken(token);
    if (adminParsed.valid && adminParsed.userId) {
      const user = await serverDb.getUserById(adminParsed.userId);
      if (user) return user;
    }
  }

  // 4. Fallback header
  const userIdHeader = request.headers.get('x-user-id');
  if (userIdHeader) {
    const user = await serverDb.getUserById(userIdHeader);
    if (user) return user;
  }

  return null;
}

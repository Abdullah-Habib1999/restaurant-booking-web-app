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
 * Generates an HMAC-signed secure administrative session token
 */
export function generateAdminSessionToken(userId: string, email: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_BOOTSTRAP_SECRET || 'tablereserve-admin-session-salt';
  const timestamp = Date.now();
  const payload = `${userId}:${email}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}:${hmac}`).toString('base64');
}

/**
 * Verifies and parses an administrative session token
 */
export function verifyAdminSessionToken(token: string): { valid: boolean; userId?: string; email?: string } {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
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

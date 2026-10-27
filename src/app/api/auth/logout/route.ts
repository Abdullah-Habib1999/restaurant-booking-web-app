import { NextResponse } from 'next/server';
import { USER_COOKIE_NAME } from '@/lib/authCrypto';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
  response.cookies.delete(USER_COOKIE_NAME);
  return response;
}

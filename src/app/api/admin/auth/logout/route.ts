import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME } from '@/lib/authCrypto';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Admin signed out successfully.' });
  response.cookies.delete(ADMIN_COOKIE_NAME);
  return response;
}

import { NextResponse } from 'next/server';
import { serverDb } from '@/lib/serverDb';

export async function GET() {
  try {
    const hasAdmin = serverDb.hasAnyAdmin();
    const isBootstrapSecretRequired = Boolean(process.env.ADMIN_BOOTSTRAP_SECRET);

    return NextResponse.json({
      hasAdmin,
      isBootstrapSecretRequired
    });
  } catch (err: any) {
    console.error('API /api/admin/status error:', err);
    return NextResponse.json({ error: 'Failed to inspect admin status' }, { status: 500 });
  }
}

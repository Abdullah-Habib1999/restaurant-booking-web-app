import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/serverDb';

export async function GET(request: NextRequest) {
  try {
    // Read request property to ensure dynamic server execution per request
    const _reqUrl = request.url;
    const hasAdmin = serverDb.hasAnyAdmin();
    const isBootstrapSecretRequired = Boolean(process.env.ADMIN_BOOTSTRAP_SECRET);

    return NextResponse.json({
      hasAdmin,
      isBootstrapSecretRequired
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_')) throw err;
    console.error('API /api/admin/status error:', err);
    return NextResponse.json({ error: 'Failed to inspect admin status' }, { status: 500 });
  }
}

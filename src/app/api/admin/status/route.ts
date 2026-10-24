import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/serverDb';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    // Read request property to ensure dynamic server execution per request
    const _reqUrl = request.url;
    let hasAdmin = serverDb.hasAnyAdmin();
    if (!hasAdmin && supabaseServer.isConfigured()) {
      hasAdmin = await supabaseServer.hasAnyAdmin();
    }
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

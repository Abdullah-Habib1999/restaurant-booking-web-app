import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/serverDb';

async function getAuthenticatedAdmin(request: NextRequest) {
  const adminId = request.headers.get('x-admin-user-id') || request.headers.get('x-user-id');
  if (!adminId) return null;
  const user = await serverDb.getUserById(adminId);
  return user && user.role === 'admin' ? user : null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const id = searchParams.get('id');
    const admin = await getAuthenticatedAdmin(request);
    const callerUserId = request.headers.get('x-user-id') || '';

    if (slug) {
      const rest = await serverDb.getRestaurantBySlug(slug);
      if (!rest) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      
      // If restaurant is not published, only its owner or an admin can view details
      if (rest.status !== 'published') {
        const isOwner = rest.ownerId === callerUserId;
        const isAdmin = Boolean(admin);
        if (!isOwner && !isAdmin) {
          return NextResponse.json({ error: 'Restaurant is awaiting approval or inactive.' }, { status: 404 });
        }
      }
      return NextResponse.json(rest);
    }

    if (id) {
      const rest = await serverDb.getRestaurantById(id);
      if (!rest) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      if (rest.status !== 'published') {
        const isOwner = rest.ownerId === callerUserId;
        const isAdmin = Boolean(admin);
        if (!isOwner && !isAdmin) {
          return NextResponse.json({ error: 'Restaurant is awaiting approval or inactive.' }, { status: 404 });
        }
      }
      return NextResponse.json(rest);
    }

    const all = await serverDb.getRestaurants();
    const includeUnpublished = searchParams.get('includeUnpublished') === 'true';

    // Only authorized admins can request unapproved/pending/suspended venues
    if (includeUnpublished && admin) {
      return NextResponse.json(all);
    }

    // Public view: strictly only published venues
    const publicList = all.filter(r => r.status === 'published');
    return NextResponse.json(publicList);
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_')) throw err;
    console.error('API /api/restaurants GET error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const admin = await getAuthenticatedAdmin(request);

    // If existing restaurant
    const existing = body.id ? await serverDb.getRestaurantById(body.id) : null;

    if (!admin) {
      // Non-admin cannot unilaterally publish or approve a restaurant
      if (!existing) {
        // New registration: must always start in pending_approval
        body.status = 'pending_approval';
        body.rejectionReason = undefined;
        body.reviewedByAdminId = undefined;
        body.reviewedAt = undefined;
      } else {
        // Existing update by owner: preserve current status, cannot change to 'published'
        body.status = existing.status;
        body.rejectionReason = existing.rejectionReason;
        body.reviewedByAdminId = existing.reviewedByAdminId;
        body.reviewedAt = existing.reviewedAt;
        body.suspendedAt = existing.suspendedAt;
        body.suspendedReason = existing.suspendedReason;
      }
    }

    const saved = await serverDb.saveRestaurant(body);
    return NextResponse.json(saved);
  } catch (err: any) {
    console.error('API /api/restaurants POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

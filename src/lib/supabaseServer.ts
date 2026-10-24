import { UserProfile, Restaurant, RestaurantStatus } from '@/types';

// Server-side Supabase client for persistent, multi-container production storage
// Uses the private SUPABASE_SERVICE_ROLE_KEY exclusively on the server to bypass RLS safely
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseServer = {
  isConfigured: (): boolean => {
    return Boolean(supabaseUrl && serviceRoleKey);
  },

  getAdminUserByEmail: async (email: string): Promise<UserProfile | null> => {
    if (!supabaseUrl || !serviceRoleKey) return null;
    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await fetch(
        `${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(cleanEmail)}&role=eq.admin&select=*`,
        {
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        }
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return null;
      const row = data[0];
      return {
        id: row.id,
        email: row.email,
        fullName: row.full_name || row.fullName || 'Super Administrator',
        phone: row.phone || undefined,
        role: row.role || 'admin',
        password: row.password || undefined,
        createdAt: row.created_at || new Date().toISOString()
      };
    } catch (e) {
      console.warn('[supabaseServer] getAdminUserByEmail error:', e);
      return null;
    }
  },

  hasAnyAdmin: async (): Promise<boolean> => {
    if (!supabaseUrl || !serviceRoleKey) return false;
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/profiles?role=eq.admin&select=id`,
        {
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
            'Range': '0-0'
          },
          cache: 'no-store'
        }
      );
      if (!res.ok) return false;
      const data = await res.json();
      return Array.isArray(data) && data.length > 0;
    } catch {
      return false;
    }
  },

  saveAdminUser: async (user: UserProfile): Promise<boolean> => {
    if (!supabaseUrl || !serviceRoleKey) return false;
    try {
      const payload = {
        id: user.id,
        email: user.email.toLowerCase(),
        full_name: user.fullName,
        phone: user.phone || null,
        role: 'admin',
        password: user.password || null,
        updated_at: new Date().toISOString()
      };

      const res = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payload)
      });
      return res.ok;
    } catch (e) {
      console.warn('[supabaseServer] saveAdminUser error:', e);
      return false;
    }
  },

  updateRestaurantStatus: async (
    restaurantId: string,
    status: RestaurantStatus,
    metadata?: {
      reviewedByAdminId?: string;
      reviewedAt?: string;
      rejectionReason?: string;
      suspendedReason?: string;
      suspendedAt?: string;
    }
  ): Promise<boolean> => {
    if (!supabaseUrl || !serviceRoleKey) return false;
    try {
      const payload: Record<string, any> = {
        status,
        updated_at: new Date().toISOString()
      };
      if (metadata?.reviewedByAdminId) payload.reviewed_by_admin_id = metadata.reviewedByAdminId;
      if (metadata?.reviewedAt) payload.reviewed_at = metadata.reviewedAt;
      if (metadata?.rejectionReason) payload.rejection_reason = metadata.rejectionReason;
      if (metadata?.suspendedReason) payload.suspended_reason = metadata.suspendedReason;
      if (metadata?.suspendedAt) payload.suspended_at = metadata.suspendedAt;

      const res = await fetch(`${supabaseUrl}/rest/v1/restaurants?id=eq.${encodeURIComponent(restaurantId)}`, {
        method: 'PATCH',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      return res.ok;
    } catch (e) {
      console.warn('[supabaseServer] updateRestaurantStatus error:', e);
      return false;
    }
  }
};

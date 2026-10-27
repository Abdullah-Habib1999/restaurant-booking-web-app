import { Restaurant, UserProfile } from '@/types';

export interface AdminStats {
  totalRestaurants: number;
  pendingApprovals: number;
  approvedRestaurants: number;
  rejectedRegistrations: number;
  suspendedRestaurants: number;
  totalReservations: number;
  totalCustomers: number;
}

export interface AdminRestaurantItem extends Restaurant {
  owner?: UserProfile;
  tableCount?: number;
}

const STORAGE_KEY = 'tablereserve_admin_user';
const TOKEN_KEY = 'tablereserve_admin_token';

export const adminAuth = {
  getStoredAdmin: (): UserProfile | null => {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  getStoredToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  setStoredAdmin: (admin: UserProfile, token?: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(admin));
    if (token) localStorage.setItem(TOKEN_KEY, token);
    // Also sync standard auth context user key if needed
    localStorage.setItem('restro_active_user_id', admin.id);
  },

  clearStoredAdmin: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
  },

  getHeaders: (): Record<string, string> => {
    const admin = adminAuth.getStoredAdmin();
    const token = adminAuth.getStoredToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (admin?.id) {
      headers['x-admin-user-id'] = admin.id;
      headers['x-user-id'] = admin.id;
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }
};

export const adminApi = {
  checkStatus: async (): Promise<{ hasAdmin: boolean; isBootstrapSecretRequired: boolean }> => {
    const res = await fetch('/api/admin/status', { 
      credentials: 'include',
      cache: 'no-store' 
    });
    if (!res.ok) throw new Error('Failed to query admin status');
    return res.json();
  },

  setupFirstAdmin: async (data: {
    fullName: string;
    email: string;
    password: string;
    bootstrapSecret?: string;
  }): Promise<{ success: boolean; admin: UserProfile; token?: string; error?: string }> => {
    const res = await fetch('/api/admin/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to initialize Super Admin');
    }
    if (result.admin) {
      adminAuth.setStoredAdmin(result.admin, result.token);
    }
    return result;
  },

  login: async (email: string, password: string): Promise<{ success: boolean; admin: UserProfile; token: string }> => {
    const res = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Login failed');
    }
    if (result.admin) {
      adminAuth.setStoredAdmin(result.admin, result.token);
    }
    return result;
  },

  logout: async (): Promise<void> => {
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch {}
    adminAuth.clearStoredAdmin();
  },

  verifySession: async (): Promise<{ authenticated: boolean; admin?: UserProfile }> => {
    try {
      const headers = adminAuth.getHeaders();
      const res = await fetch('/api/admin/auth/verify', { 
        headers, 
        credentials: 'include',
        cache: 'no-store' 
      });
      if (!res.ok) return { authenticated: false };
      const data = await res.json();
      if (data.authenticated && data.admin) {
        adminAuth.setStoredAdmin(data.admin);
      }
      return data;
    } catch {
      return { authenticated: false };
    }
  },

  getStats: async (): Promise<AdminStats> => {
    const res = await fetch('/api/admin/stats', {
      headers: adminAuth.getHeaders(),
      credentials: 'include',
      cache: 'no-store'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch admin stats');
    }
    return res.json();
  },

  getRestaurants: async (params?: { status?: string; search?: string }): Promise<AdminRestaurantItem[]> => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.search) query.set('search', params.search);

    const res = await fetch(`/api/admin/restaurants?${query.toString()}`, {
      headers: adminAuth.getHeaders(),
      credentials: 'include',
      cache: 'no-store'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch restaurants');
    }
    return res.json();
  },

  approveRestaurant: async (restaurantId: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch('/api/admin/restaurants/approve', {
      method: 'POST',
      headers: adminAuth.getHeaders(),
      credentials: 'include',
      body: JSON.stringify({ restaurantId })
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to approve restaurant');
    }
    return result;
  },

  rejectRestaurant: async (restaurantId: string, reason: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch('/api/admin/restaurants/reject', {
      method: 'POST',
      headers: adminAuth.getHeaders(),
      credentials: 'include',
      body: JSON.stringify({ restaurantId, reason })
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to reject registration');
    }
    return result;
  },

  suspendRestaurant: async (restaurantId: string, reason: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch('/api/admin/restaurants/suspend', {
      method: 'POST',
      headers: adminAuth.getHeaders(),
      credentials: 'include',
      body: JSON.stringify({ restaurantId, reason })
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to suspend restaurant');
    }
    return result;
  },

  reactivateRestaurant: async (restaurantId: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch('/api/admin/restaurants/reactivate', {
      method: 'POST',
      headers: adminAuth.getHeaders(),
      credentials: 'include',
      body: JSON.stringify({ restaurantId })
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to reactivate restaurant');
    }
    return result;
  }
};

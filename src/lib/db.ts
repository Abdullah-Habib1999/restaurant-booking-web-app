import { 
  Restaurant, 
  DiningTable, 
  MenuCategory, 
  MenuItem, 
  Reservation, 
  RestaurantHours, 
  RestaurantClosure,
  TimeSlotAvailability,
  UserProfile,
  ReservationStatus
} from '@/types';
import { 
  INITIAL_RESTAURANTS, 
  INITIAL_TABLES, 
  INITIAL_HOURS, 
  INITIAL_MENU_CATEGORIES, 
  INITIAL_MENU_ITEMS, 
  INITIAL_RESERVATIONS 
} from '@/data/seed';

const isBrowser = typeof window !== 'undefined';

// Safe fetch wrapper that works both in client browser and server node
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const baseUrl = isBrowser ? '' : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    const res = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {})
      },
      cache: 'no-store'
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      const errorText = await res.text();
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.error || errorJson.message || `API error ${res.status}`);
      } catch (e: any) {
        throw new Error(e.message || `API error ${res.status}: ${errorText}`);
      }
    }
    return await res.json();
  } catch (err) {
    console.warn(`[Client db] apiFetch failed for ${endpoint}:`, err);
    return null;
  }
}

// In-memory fallbacks if API is temporarily unreachable during SSR/prerender
let memRestaurants = [...INITIAL_RESTAURANTS];
let memTables = [...INITIAL_TABLES];
let memHours = [...INITIAL_HOURS];
let memClosures: RestaurantClosure[] = [];
let memCategories = [...INITIAL_MENU_CATEGORIES];
let memMenuItems = [...INITIAL_MENU_ITEMS];
let memReservations = [...INITIAL_RESERVATIONS];
let memUsers: UserProfile[] = [
  {
    id: 'cust-1',
    email: 'customer@demo.com',
    fullName: 'Eleanor Vance',
    phone: '+1 (555) 234-9988',
    role: 'customer',
    password: 'password123',
    createdAt: new Date().toISOString()
  },
  {
    id: 'owner-1',
    email: 'owner@losteria.com',
    fullName: 'Chef Marco Bellini',
    phone: '+1 (555) 349-8201',
    role: 'restaurant_owner',
    password: 'password123',
    ownedRestaurantId: 'rest-1',
    createdAt: new Date().toISOString()
  },
  {
    id: 'owner-2',
    email: 'owner@saffron.com',
    fullName: 'Rajiv Mehra',
    phone: '+1 (555) 782-9014',
    role: 'restaurant_owner',
    password: 'password123',
    ownedRestaurantId: 'rest-2',
    createdAt: new Date().toISOString()
  }
];

export const db = {
  // --- RESTAURANTS ---
  getRestaurants: async (): Promise<Restaurant[]> => {
    const data = await apiFetch<Restaurant[]>('/api/restaurants');
    if (data && Array.isArray(data)) {
      memRestaurants = data;
      return data;
    }
    return memRestaurants;
  },

  getRestaurantBySlug: async (slug: string): Promise<Restaurant | null> => {
    const data = await apiFetch<Restaurant>(`/api/restaurants?slug=${encodeURIComponent(slug)}`);
    if (data) return data;
    const list = await db.getRestaurants();
    return list.find(r => r.slug === slug) || null;
  },

  getRestaurantById: async (id: string): Promise<Restaurant | null> => {
    const data = await apiFetch<Restaurant>(`/api/restaurants?id=${encodeURIComponent(id)}`);
    if (data) return data;
    const list = await db.getRestaurants();
    return list.find(r => r.id === id) || null;
  },

  saveRestaurant: async (restaurant: Restaurant): Promise<Restaurant> => {
    const data = await apiFetch<Restaurant>('/api/restaurants', {
      method: 'POST',
      body: JSON.stringify(restaurant)
    });
    if (data) return data;
    const idx = memRestaurants.findIndex(r => r.id === restaurant.id);
    if (idx >= 0) {
      memRestaurants[idx] = restaurant;
    } else {
      memRestaurants.push(restaurant);
    }
    return restaurant;
  },

  // --- TABLES ---
  getTables: async (restaurantId: string): Promise<DiningTable[]> => {
    const data = await apiFetch<{ tables: DiningTable[] }>(`/api/restaurant-data?restaurantId=${encodeURIComponent(restaurantId)}`);
    if (data?.tables) return data.tables;
    return memTables.filter(t => t.restaurantId === restaurantId);
  },

  saveTable: async (table: DiningTable): Promise<DiningTable> => {
    const data = await apiFetch<DiningTable>('/api/restaurant-data', {
      method: 'POST',
      body: JSON.stringify({ action: 'saveTable', table })
    });
    if (data) return data;
    const idx = memTables.findIndex(t => t.id === table.id);
    if (idx >= 0) {
      memTables[idx] = table;
    } else {
      memTables.push(table);
    }
    return table;
  },

  deleteTable: async (tableId: string): Promise<void> => {
    await apiFetch('/api/restaurant-data', {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteTable', tableId })
    });
    memTables = memTables.filter(t => t.id !== tableId);
  },

  // --- MENU CATEGORIES & ITEMS ---
  getMenuCategories: async (restaurantId: string): Promise<MenuCategory[]> => {
    const data = await apiFetch<{ categories: MenuCategory[] }>(`/api/restaurant-data?restaurantId=${encodeURIComponent(restaurantId)}`);
    if (data?.categories) return data.categories.sort((a, b) => a.displayOrder - b.displayOrder);
    return memCategories.filter(c => c.restaurantId === restaurantId).sort((a, b) => a.displayOrder - b.displayOrder);
  },

  saveMenuCategory: async (category: MenuCategory): Promise<MenuCategory> => {
    const data = await apiFetch<MenuCategory>('/api/restaurant-data', {
      method: 'POST',
      body: JSON.stringify({ action: 'saveCategory', category })
    });
    if (data) return data;
    const idx = memCategories.findIndex(c => c.id === category.id);
    if (idx >= 0) {
      memCategories[idx] = category;
    } else {
      memCategories.push(category);
    }
    return category;
  },

  deleteMenuCategory: async (categoryId: string): Promise<void> => {
    await apiFetch('/api/restaurant-data', {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteCategory', categoryId })
    });
    memCategories = memCategories.filter(c => c.id !== categoryId);
  },

  getMenuItems: async (restaurantId: string): Promise<MenuItem[]> => {
    const data = await apiFetch<{ items: MenuItem[] }>(`/api/restaurant-data?restaurantId=${encodeURIComponent(restaurantId)}`);
    if (data?.items) return data.items;
    return memMenuItems.filter(m => m.restaurantId === restaurantId);
  },

  saveMenuItem: async (item: MenuItem): Promise<MenuItem> => {
    const data = await apiFetch<MenuItem>('/api/restaurant-data', {
      method: 'POST',
      body: JSON.stringify({ action: 'saveMenuItem', menuItem: item })
    });
    if (data) return data;
    const idx = memMenuItems.findIndex(m => m.id === item.id);
    if (idx >= 0) {
      memMenuItems[idx] = item;
    } else {
      memMenuItems.push(item);
    }
    return item;
  },

  deleteMenuItem: async (itemId: string): Promise<void> => {
    await apiFetch('/api/restaurant-data', {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteMenuItem', menuItemId: itemId })
    });
    memMenuItems = memMenuItems.filter(m => m.id !== itemId);
  },

  // --- OPERATING HOURS & CLOSURES ---
  getRestaurantHours: async (restaurantId: string): Promise<RestaurantHours[]> => {
    const data = await apiFetch<{ hours: RestaurantHours[] }>(`/api/restaurant-data?restaurantId=${encodeURIComponent(restaurantId)}`);
    if (data?.hours) return data.hours;
    return memHours.filter(h => h.restaurantId === restaurantId);
  },

  saveRestaurantHours: async (restaurantId: string, hours: RestaurantHours[]): Promise<void> => {
    await apiFetch('/api/restaurant-data', {
      method: 'POST',
      body: JSON.stringify({ action: 'saveHours', restaurantId, hours })
    });
    const filtered = memHours.filter(h => h.restaurantId !== restaurantId);
    memHours = [...filtered, ...hours];
  },

  getRestaurantClosures: async (restaurantId: string): Promise<RestaurantClosure[]> => {
    return memClosures.filter(c => c.restaurantId === restaurantId);
  },

  saveRestaurantClosure: async (closure: RestaurantClosure): Promise<void> => {
    memClosures = [...memClosures.filter(c => c.id !== closure.id), closure];
  },

  deleteRestaurantClosure: async (closureId: string): Promise<void> => {
    memClosures = memClosures.filter(c => c.id !== closureId);
  },

  // --- RESERVATIONS (SERVER DATABASE BACKED) ---
  getReservations: async (filter?: { restaurantId?: string; customerId?: string }): Promise<Reservation[]> => {
    const params = new URLSearchParams();
    if (filter?.restaurantId) params.append('restaurantId', filter.restaurantId);
    if (filter?.customerId) params.append('customerId', filter.customerId);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    const data = await apiFetch<Reservation[]>(`/api/reservations${query}`);
    if (data && Array.isArray(data)) {
      return data;
    }

    let list = [...memReservations];
    if (filter?.restaurantId) {
      list = list.filter(r => r.restaurantId === filter.restaurantId);
    }
    if (filter?.customerId) {
      list = list.filter(r => r.customerId === filter.customerId);
    }
    return list.sort((a, b) => new Date(`${b.reservationDate}T${b.startTime}`).getTime() - new Date(`${a.reservationDate}T${a.startTime}`).getTime());
  },

  getReservationById: async (id: string): Promise<Reservation | null> => {
    const data = await apiFetch<Reservation>(`/api/reservations?id=${encodeURIComponent(id)}`);
    if (data) return data;
    const list = await db.getReservations();
    return list.find(r => r.id === id || r.bookingReference === id) || null;
  },

  // Active reservation check for existing booking popup
  getActiveBookingForCustomer: async (
    restaurantId: string, 
    customerId: string, 
    date?: string
  ): Promise<Reservation | null> => {
    const checkDate = date || new Date().toISOString().split('T')[0];
    const data = await apiFetch<{ activeBooking: Reservation | null }>(
      `/api/reservations/active?restaurantId=${encodeURIComponent(restaurantId)}&customerId=${encodeURIComponent(customerId)}&date=${encodeURIComponent(checkDate)}`
    );
    if (data && data.activeBooking) return data.activeBooking;
    
    // Fallback
    const reservations = await db.getReservations({ restaurantId, customerId });
    return reservations.find(r => 
      r.reservationDate >= checkDate && 
      ['confirmed', 'pending', 'checked_in'].includes(r.status)
    ) || null;
  },

  // REAL CAPACITY & AVAILABILITY ENGINE (CROSS-USER LIVE DATABASE)
  checkSlotAvailability: async (
    restaurantId: string,
    date: string,
    partySize: number
  ): Promise<TimeSlotAvailability[]> => {
    const data = await apiFetch<TimeSlotAvailability[]>(
      `/api/slots?restaurantId=${encodeURIComponent(restaurantId)}&date=${encodeURIComponent(date)}&partySize=${partySize}`
    );
    if (data && Array.isArray(data)) {
      return data;
    }

    // SSR fallback if fetch failed
    return [];
  },

  // CREATE RESERVATION (CALLS SERVER DB ATOMICALLY)
  createReservation: async (data: {
    restaurantId: string;
    customerId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    partySize: number;
    reservationDate: string;
    startTime: string;
    specialRequests?: string;
    items?: { menuItemId: string; quantity: number }[];
  }): Promise<{ success: boolean; reservation?: Reservation; error?: string }> => {
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        cache: 'no-store'
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.error('db.createReservation failed:', err);
      return { success: false, error: err.message || 'Failed to connect to reservation service.' };
    }
  },

  updateReservationStatus: async (
    reservationId: string, 
    newStatus: ReservationStatus, 
    cancellationReason?: string
  ): Promise<Reservation | null> => {
    try {
      const res = await fetch('/api/reservations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reservationId,
          status: newStatus,
          cancellationReason
        }),
        cache: 'no-store'
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error('db.updateReservationStatus error:', err);
      return null;
    }
  },

  assignReservationTable: async (reservationId: string, tableId: string): Promise<Reservation | null> => {
    try {
      const res = await fetch('/api/reservations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reservationId,
          assignedTableId: tableId
        }),
        cache: 'no-store'
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error('db.assignReservationTable error:', err);
      return null;
    }
  },

  // USERS
  getUsers: async (): Promise<UserProfile[]> => {
    const data = await apiFetch<UserProfile[]>('/api/users');
    if (data && Array.isArray(data)) return data;
    return memUsers;
  },

  getUserById: async (id: string): Promise<UserProfile | null> => {
    const data = await apiFetch<UserProfile>(`/api/users?id=${encodeURIComponent(id)}`);
    if (data) return data;
    const list = await db.getUsers();
    return list.find(u => u.id === id) || null;
  },

  getUserByEmail: async (email: string): Promise<UserProfile | null> => {
    const data = await apiFetch<UserProfile>(`/api/users?email=${encodeURIComponent(email)}`);
    if (data) return data;
    const list = await db.getUsers();
    return list.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  saveUser: async (user: UserProfile): Promise<UserProfile> => {
    const data = await apiFetch<UserProfile>('/api/users', {
      method: 'POST',
      body: JSON.stringify(user)
    });
    if (data) return data;
    return user;
  }
};

// Helper utilities for time calculations
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function formatTime12h(timeStr: string): string {
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${ampm}`;
}

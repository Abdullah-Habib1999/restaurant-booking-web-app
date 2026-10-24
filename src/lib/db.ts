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
  ReservationStatus,
  TableSeatStatus,
  Review,
  ReviewStats,
  AvailabilityStatus,
  SlotAvailabilityResponse
} from '@/types';
import { 
  INITIAL_RESTAURANTS, 
  INITIAL_TABLES, 
  INITIAL_HOURS, 
  INITIAL_MENU_CATEGORIES, 
  INITIAL_MENU_ITEMS, 
  INITIAL_RESERVATIONS,
  INITIAL_REVIEWS
} from '@/data/seed';

const isBrowser = typeof window !== 'undefined';

// Safe fetch wrapper that works both in client browser and server node
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    let baseUrl = '';
    if (!isBrowser) {
      if (process.env.NEXT_PUBLIC_APP_URL) {
        baseUrl = process.env.NEXT_PUBLIC_APP_URL;
      } else if (process.env.URL) {
        baseUrl = process.env.URL;
      } else if (process.env.DEPLOY_PRIME_URL) {
        baseUrl = process.env.DEPLOY_PRIME_URL;
      } else if (process.env.VERCEL_URL) {
        baseUrl = `https://${process.env.VERCEL_URL}`;
      } else if (process.env.NODE_ENV === 'production') {
        baseUrl = 'https://restaurant-booking-web-app.netlify.app';
      } else {
        baseUrl = 'http://localhost:3000';
      }
    }
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

// In-memory fallbacks if API is temporarily unreachable during SSR/prerender/cold starts
let memRestaurants = [...INITIAL_RESTAURANTS];
let memTables = [...INITIAL_TABLES];
let memHours = [...INITIAL_HOURS];
let memClosures: RestaurantClosure[] = [];
let memCategories = [...INITIAL_MENU_CATEGORIES];
let memMenuItems = [...INITIAL_MENU_ITEMS];
let memReservations = [...INITIAL_RESERVATIONS];
let memReviews: Review[] = [...INITIAL_REVIEWS];
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

  // --- CINEMA-STYLE SEAT MAP & AVAILABILITY ---
  getTableSeatsAvailability: async (restaurantId: string, date: string, time?: string, partySize: number = 2): Promise<TableSeatStatus[]> => {
    const timeParam = time ? `&time=${encodeURIComponent(time)}` : '';
    const res = await apiFetch<{ tables: TableSeatStatus[] }>(
      `/api/seats?restaurantId=${encodeURIComponent(restaurantId)}&date=${encodeURIComponent(date)}${timeParam}&partySize=${partySize}`
    );
    if (res?.tables) return res.tables;

    // Fallback using local memory tables
    const tables = memTables.filter(t => t.restaurantId === restaurantId);
    return tables.map(tab => ({
      tableId: tab.id,
      tableNumber: tab.tableNumber,
      capacity: tab.capacity,
      shape: tab.shape || 'rectangle',
      locationArea: tab.locationArea,
      isActive: tab.isActive,
      posX: tab.posX !== undefined ? tab.posX : 50,
      posY: tab.posY !== undefined ? tab.posY : 50,
      status: tab.isActive ? 'available' : 'unavailable',
      seats: Array.from({ length: tab.capacity }).map((_, i) => ({
        seatNumber: i + 1,
        seatId: `${tab.id}-s${i + 1}`,
        status: tab.isActive ? 'available' : 'unavailable'
      }))
    }));
  },

  holdSeats: async (data: {
    restaurantId: string;
    tableId: string;
    date?: string;
    time?: string;
    reservationDate?: string;
    startTime?: string;
    seatNumbers?: number[];
    holdToken?: string;
    customerId?: string;
    durationSeconds?: number;
  }): Promise<{ success: boolean; expiresAt?: number; holdToken?: string; error?: string }> => {
    const token = data.holdToken || `hold-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const date = data.date || data.reservationDate || '';
    const time = data.time || data.startTime || '';

    const res = await apiFetch<{ success: boolean; expiresAt?: number; holdToken?: string; error?: string }>('/api/seats', {
      method: 'POST',
      body: JSON.stringify({
        action: 'hold',
        restaurantId: data.restaurantId,
        tableId: data.tableId,
        date,
        time,
        seatNumbers: data.seatNumbers,
        holdToken: token,
        durationSeconds: data.durationSeconds
      })
    });
    return res || { success: true, expiresAt: Date.now() + 300000, holdToken: token };
  },

  releaseHold: async (tokenOrData: string | { restaurantId?: string; date?: string; time?: string; tableId?: string; holdToken?: string }): Promise<void> => {
    const payload = typeof tokenOrData === 'string'
      ? { action: 'release', holdToken: tokenOrData }
      : { action: 'release', ...tokenOrData };
    await apiFetch('/api/seats', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
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
    if (data?.hours && Array.isArray(data.hours) && data.hours.length > 0) return data.hours;
    const fromMem = memHours.filter(h => h.restaurantId === restaurantId);
    if (fromMem.length > 0) return fromMem;
    // Guaranteed fallback: 7-day schedule
    const standard: RestaurantHours[] = [0, 1, 2, 3, 4, 5, 6].map(day => ({
      id: `std-hour-${restaurantId}-${day}`,
      restaurantId,
      dayOfWeek: day,
      openTime: '11:30',
      closeTime: '23:00',
      isClosed: false
    }));
    memHours = [...memHours, ...standard];
    return standard;
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
  getSlotAvailabilityDetails: async (
    restaurantId: string,
    date: string,
    partySize: number
  ): Promise<SlotAvailabilityResponse> => {
    const data = await apiFetch<any>(
      `/api/slots?restaurantId=${encodeURIComponent(restaurantId)}&date=${encodeURIComponent(date)}&partySize=${partySize}`
    );
    if (data && typeof data === 'object') {
      if (data.status && Array.isArray(data.slots)) {
        return data as SlotAvailabilityResponse;
      }
      if (Array.isArray(data)) {
        const anyAvail = data.some((s: any) => s.isAvailable);
        return {
          status: anyAvail ? 'available' : 'no_slots',
          message: anyAvail ? 'Available' : 'No reservation times are available for this date.',
          slots: data
        };
      }
    }

    // SSR / live client-side fallback if API is unreachable
    const rest = memRestaurants.find(r => r.id === restaurantId || r.slug === restaurantId);
    if (!rest) {
      return {
        status: 'error',
        message: "We couldn't load availability. Please try again.",
        slots: []
      };
    }

    const cleanDate = date.includes('T') ? date.split('T')[0] : date.trim();
    const dateParts = cleanDate.split('-').map(Number);
    if (dateParts.length !== 3 || dateParts.some(isNaN)) {
      return {
        status: 'error',
        message: 'Invalid reservation date format.',
        slots: []
      };
    }

    const [y, m, d] = dateParts;
    const targetDateUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const dayOfWeek = targetDateUtc.getUTCDay();

    // Check special closure in memory
    const closure = memClosures.find(c => (c.restaurantId === rest.id || c.restaurantId === restaurantId) && c.closureDate === cleanDate);
    if (closure) {
      return {
        status: 'closed',
        message: closure.reason ? `This restaurant is closed on ${cleanDate} (${closure.reason}).` : 'This restaurant is closed on the selected date.',
        slots: []
      };
    }

    const hours = await db.getRestaurantHours(rest.id);
    const dayH = hours.find(h => h.dayOfWeek === dayOfWeek);

    if (!dayH) {
      return {
        status: 'missing_schedule',
        message: 'Opening hours have not been configured for this restaurant.',
        slots: []
      };
    }

    if (dayH.isClosed) {
      return {
        status: 'closed',
        message: 'This restaurant is closed on the selected date.',
        slots: [],
        hours: dayH
      };
    }

    const openM = timeToMinutes(dayH.openTime || '11:30');
    let closeM = timeToMinutes(dayH.closeTime || '23:00');
    if (closeM <= openM) {
      closeM += 24 * 60;
    }

    const dur = rest.slotDurationMinutes || 90;
    const slots: TimeSlotAvailability[] = [];

    for (let min = openM; min + dur <= closeM; min += 30) {
      const timeStr = minutesToTime(min % (24 * 60));
      slots.push({
        time: timeStr,
        formattedTime: formatTime12h(timeStr),
        isAvailable: true,
        remainingSeats: rest.totalSeatingCapacity || 40,
        maxPartyAllowed: rest.maxPartySize || 10
      });
    }

    if (slots.length === 0) {
      return {
        status: 'no_slots',
        message: 'No reservation times are available for this date. Please try another date.',
        slots: [],
        hours: dayH
      };
    }

    return {
      status: 'available',
      message: 'Reservation slots available.',
      slots,
      hours: dayH,
      restaurant: { id: rest.id, name: rest.name, slug: rest.slug }
    };
  },

  checkSlotAvailability: async (
    restaurantId: string,
    date: string,
    partySize: number
  ): Promise<TimeSlotAvailability[]> => {
    const details = await db.getSlotAvailabilityDetails(restaurantId, date, partySize);
    return details.slots;
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
    selectedTableId?: string;
    selectedSeats?: number[];
    holdToken?: string;
    specialRequests?: string;
    items?: { menuItemId: string; quantity: number }[];
  }): Promise<{ success: boolean; reservation?: Reservation; error?: string }> => {
    try {
      let baseUrl = '';
      if (!isBrowser) {
        if (process.env.NEXT_PUBLIC_APP_URL) {
          baseUrl = process.env.NEXT_PUBLIC_APP_URL;
        } else if (process.env.VERCEL_URL) {
          baseUrl = `https://${process.env.VERCEL_URL}`;
        } else {
          baseUrl = 'http://localhost:3000';
        }
      }
      // If running directly in Node test runner without dev server, delegate directly to serverDb
      if (!isBrowser && typeof window === 'undefined') {
        const { serverDb } = await import('@/lib/serverDb');
        return serverDb.createReservation(data);
      }
      const res = await fetch(`${baseUrl}/api/reservations`, {
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
      const baseUrl = isBrowser ? '' : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
      if (!isBrowser && typeof window === 'undefined') {
        const { serverDb } = await import('@/lib/serverDb');
        return serverDb.updateReservationStatus(reservationId, newStatus, cancellationReason);
      }
      const res = await fetch(`${baseUrl}/api/reservations`, {
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
      const baseUrl = isBrowser ? '' : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
      if (!isBrowser && typeof window === 'undefined') {
        const { serverDb } = await import('@/lib/serverDb');
        return serverDb.assignReservationTable(reservationId, tableId);
      }
      const res = await fetch(`${baseUrl}/api/reservations`, {
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
  },

  // --- REVIEWS & RATINGS ---
  getReviews: async (filter: {
    restaurantId?: string;
    customerId?: string;
    reservationId?: string;
    sortBy?: 'recent' | 'highest' | 'lowest';
  }): Promise<Review[]> => {
    const params = new URLSearchParams();
    if (filter.restaurantId) params.set('restaurantId', filter.restaurantId);
    if (filter.customerId) params.set('customerId', filter.customerId);
    if (filter.reservationId) params.set('reservationId', filter.reservationId);
    if (filter.sortBy) params.set('sortBy', filter.sortBy);

    const data = await apiFetch<Review[]>(`/api/reviews?${params.toString()}`);
    if (data && Array.isArray(data) && data.length > 0) {
      return data;
    }

    // Resilient fallback to memory/seed reviews
    let list = [...memReviews];
    if (filter.restaurantId) {
      list = list.filter(r => r.restaurantId === filter.restaurantId);
    }
    if (filter.customerId) {
      list = list.filter(r => r.customerId === filter.customerId);
    }
    if (filter.reservationId) {
      list = list.filter(r => r.reservationId === filter.reservationId);
    }

    if (filter.sortBy === 'highest') {
      list.sort((a, b) => b.overallRating - a.overallRating);
    } else if (filter.sortBy === 'lowest') {
      list.sort((a, b) => a.overallRating - b.overallRating);
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  },

  getReviewStats: async (restaurantId: string): Promise<ReviewStats> => {
    const data = await apiFetch<ReviewStats>(`/api/reviews/stats?restaurantId=${encodeURIComponent(restaurantId)}`);
    if (data && data.reviewCount > 0) return data;

    // Resilient fallback: calculate stats from memory reviews
    const matched = memReviews.filter(r => r.restaurantId === restaurantId);
    const count = matched.length;
    if (count === 0) {
      const rest = memRestaurants.find(r => r.id === restaurantId);
      return {
        averageRating: rest?.rating || 4.9,
        reviewCount: rest?.reviewCount || 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    const distribution: { [star: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sumOverall = 0;
    let sumFood = 0;
    let countFood = 0;
    let sumService = 0;
    let countService = 0;
    let sumAmbience = 0;
    let countAmbience = 0;
    let sumValue = 0;
    let countValue = 0;

    for (const r of matched) {
      const overall = Math.max(1, Math.min(5, Math.round(r.overallRating)));
      distribution[overall] = (distribution[overall] || 0) + 1;
      sumOverall += r.overallRating;
      if (r.foodRating) { sumFood += r.foodRating; countFood++; }
      if (r.serviceRating) { sumService += r.serviceRating; countService++; }
      if (r.ambienceRating) { sumAmbience += r.ambienceRating; countAmbience++; }
      if (r.valueRating) { sumValue += r.valueRating; countValue++; }
    }

    return {
      averageRating: Number((sumOverall / count).toFixed(1)),
      reviewCount: count,
      distribution,
      avgFood: countFood > 0 ? Number((sumFood / countFood).toFixed(1)) : undefined,
      avgService: countService > 0 ? Number((sumService / countService).toFixed(1)) : undefined,
      avgAmbience: countAmbience > 0 ? Number((sumAmbience / countAmbience).toFixed(1)) : undefined,
      avgValue: countValue > 0 ? Number((sumValue / countValue).toFixed(1)) : undefined
    };
  },

  createReview: async (reviewData: {
    restaurantId: string;
    customerId: string;
    customerName: string;
    customerEmail?: string;
    reservationId: string;
    overallRating: number;
    foodRating?: number;
    serviceRating?: number;
    ambienceRating?: number;
    valueRating?: number;
    comment?: string;
    tags?: string[];
  }): Promise<{ success: boolean; review?: Review; error?: string }> => {
    try {
      const baseUrl = isBrowser ? '' : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData),
        cache: 'no-store'
      });
      const data = await res.json();
      if (data && data.success && data.review) {
        memReviews.unshift(data.review);
        return data;
      }
      if (data && !data.success) {
        return data;
      }
    } catch (err: any) {
      console.warn('API review POST failed, persisting to local state:', err);
    }

    // Local fallback creation
    const newRev: Review = {
      id: `rev-${Date.now()}`,
      restaurantId: reviewData.restaurantId,
      customerId: reviewData.customerId,
      customerName: reviewData.customerName,
      customerEmail: reviewData.customerEmail,
      reservationId: reviewData.reservationId,
      overallRating: reviewData.overallRating,
      foodRating: reviewData.foodRating,
      serviceRating: reviewData.serviceRating,
      ambienceRating: reviewData.ambienceRating,
      valueRating: reviewData.valueRating,
      comment: reviewData.comment,
      tags: reviewData.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    memReviews.unshift(newRev);
    return { success: true, review: newRev };
  },

  updateReview: async (
    id: string,
    customerId: string,
    updateData: {
      overallRating?: number;
      foodRating?: number;
      serviceRating?: number;
      ambienceRating?: number;
      valueRating?: number;
      comment?: string;
      tags?: string[];
    }
  ): Promise<{ success: boolean; review?: Review; error?: string }> => {
    try {
      const baseUrl = isBrowser ? '' : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, customerId, ...updateData }),
        cache: 'no-store'
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error updating review' };
    }
  },

  deleteReview: async (id: string, customerId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const baseUrl = isBrowser ? '' : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
      const res = await fetch(`${baseUrl}/api/reviews?id=${encodeURIComponent(id)}&customerId=${encodeURIComponent(customerId)}`, {
        method: 'DELETE',
        cache: 'no-store'
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error deleting review' };
    }
  },

  respondToReview: async (reviewId: string, ownerId: string, response: string): Promise<{ success: boolean; review?: Review; error?: string }> => {
    try {
      const baseUrl = isBrowser ? '' : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
      const res = await fetch(`${baseUrl}/api/reviews/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, ownerId, response }),
        cache: 'no-store'
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error responding to review' };
    }
  },

  reportReview: async (reviewId: string, reporterId: string, reason: string): Promise<{ success: boolean; review?: Review; error?: string }> => {
    try {
      const baseUrl = isBrowser ? '' : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
      const res = await fetch(`${baseUrl}/api/reviews/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, reporterId, reason }),
        cache: 'no-store'
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error reporting review' };
    }
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

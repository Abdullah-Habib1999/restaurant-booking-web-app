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
  SlotAvailabilityResponse, 
  RestaurantStatus 
} from '@/types';
import { 
  INITIAL_RESTAURANTS, 
  INITIAL_TABLES, 
  INITIAL_HOURS, 
  INITIAL_MENU_CATEGORIES, 
  INITIAL_MENU_ITEMS, 
  INITIAL_RESERVATIONS, 
  INITIAL_REVIEWS, 
  INITIAL_USERS 
} from '@/data/seed';
import { getDb, isMongoConfigured, COLLECTIONS } from '@/lib/mongodb';
import { hashPassword, verifyPassword, isLegacyPlainText } from '@/lib/authCrypto';

// Helper utilities for time calculations
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(mins: number): string {
  const norm = ((mins % (24 * 60)) + (24 * 60)) % (24 * 60);
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function formatTime12h(timeStr: string): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = (h || 0) >= 12 ? 'PM' : 'AM';
  const displayH = (h || 0) % 12 === 0 ? 12 : (h || 0) % 12;
  return `${displayH}:${(m || 0).toString().padStart(2, '0')} ${period}`;
}

// Memory map for temporary seat holds with automatic expiration (10 min TTL)
const seatHolds = new Map<string, { token: string; expiresAt: number }>();

// In-memory fallback stores when MongoDB is not configured (e.g. initial build without env vars)
let memRestaurants: Restaurant[] = [...INITIAL_RESTAURANTS];
let memTables: DiningTable[] = [...INITIAL_TABLES];
let memHours: RestaurantHours[] = [...INITIAL_HOURS];
let memClosures: RestaurantClosure[] = [];
let memCategories: MenuCategory[] = [...INITIAL_MENU_CATEGORIES];
let memMenuItems: MenuItem[] = [...INITIAL_MENU_ITEMS];
let memReservations: Reservation[] = [...INITIAL_RESERVATIONS];
let memReviews: Review[] = [...INITIAL_REVIEWS];
let memUsers: UserProfile[] = [...INITIAL_USERS];

// Global seed flag to avoid repeated count queries on warm serverless lambdas
let hasCheckedInitialSeed = false;

async function ensureMongoSeeded(): Promise<void> {
  if (hasCheckedInitialSeed || !isMongoConfigured()) return;
  try {
    const db = await getDb();
    const count = await db.collection(COLLECTIONS.RESTAURANTS).countDocuments();
    if (count === 0) {
      console.log('[serverDb] MongoDB database is empty. Initializing baseline seed collections...');
      
      // Seed users with hashed passwords
      const seededUsers = await Promise.all(
        INITIAL_USERS.map(async (u) => {
          const pass = u.password || 'password123';
          const hashed = pass.startsWith('scrypt$') ? pass : await hashPassword(pass);
          return { ...u, _id: u.id, password: hashed };
        })
      );
      if (seededUsers.length > 0) {
        await db.collection<any>(COLLECTIONS.USERS).insertMany(seededUsers);
      }

      // Seed restaurants
      const seededRestaurants = INITIAL_RESTAURANTS.map(r => ({ ...r, _id: r.id }));
      if (seededRestaurants.length > 0) {
        await db.collection<any>(COLLECTIONS.RESTAURANTS).insertMany(seededRestaurants);
      }

      // Seed hours
      const seededHours = INITIAL_HOURS.map(h => ({ ...h, _id: h.id }));
      if (seededHours.length > 0) {
        await db.collection<any>(COLLECTIONS.RESTAURANT_HOURS).insertMany(seededHours);
      }

      // Seed tables
      const seededTables = INITIAL_TABLES.map(t => ({ ...t, _id: t.id }));
      if (seededTables.length > 0) {
        await db.collection<any>(COLLECTIONS.TABLES).insertMany(seededTables);
      }

      // Seed menu categories
      const seededCats = INITIAL_MENU_CATEGORIES.map(c => ({ ...c, _id: c.id }));
      if (seededCats.length > 0) {
        await db.collection<any>(COLLECTIONS.MENU_CATEGORIES).insertMany(seededCats);
      }

      // Seed menu items
      const seededItems = INITIAL_MENU_ITEMS.map(m => ({ ...m, _id: m.id }));
      if (seededItems.length > 0) {
        await db.collection<any>(COLLECTIONS.MENU_ITEMS).insertMany(seededItems);
      }

      // Seed reservations
      const seededRes = INITIAL_RESERVATIONS.map(res => ({ ...res, _id: res.id }));
      if (seededRes.length > 0) {
        await db.collection<any>(COLLECTIONS.RESERVATIONS).insertMany(seededRes);
      }

      // Seed reviews
      const seededReviews = INITIAL_REVIEWS.map(rev => ({ ...rev, _id: rev.id }));
      if (seededReviews.length > 0) {
        await db.collection<any>(COLLECTIONS.REVIEWS).insertMany(seededReviews);
      }

      console.log('[serverDb] Baseline seed collections successfully primed in MongoDB Atlas.');
    }

    // Provision admin from environment variables if set
    if (process.env.ADMIN_INITIAL_EMAIL && process.env.ADMIN_INITIAL_PASSWORD) {
      const envEmail = process.env.ADMIN_INITIAL_EMAIL.trim().toLowerCase();
      const envPass = process.env.ADMIN_INITIAL_PASSWORD.trim();
      const envName = process.env.ADMIN_INITIAL_NAME?.trim() || 'Super Administrator';
      const existing = await db.collection<UserProfile>(COLLECTIONS.USERS).findOne({
        email: { $regex: new RegExp(`^${envEmail}$`, 'i') }
      });

      const hashed = await hashPassword(envPass);
      if (existing) {
        await db.collection(COLLECTIONS.USERS).updateOne(
          { _id: existing.id as any },
          { $set: { role: 'admin', password: hashed, fullName: envName } }
        );
      } else {
        await db.collection(COLLECTIONS.USERS).insertOne({
          _id: 'admin-primary' as any,
          id: 'admin-primary',
          email: envEmail,
          fullName: envName,
          role: 'admin',
          password: hashed,
          createdAt: new Date().toISOString()
        } as any);
      }
    }

    hasCheckedInitialSeed = true;
  } catch (err: any) {
    console.warn('[serverDb] ensureMongoSeeded warning:', err.message);
  }
}

// Clean MongoDB document removing internal _id from client return
function cleanDoc<T>(doc: any): T {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return rest as T;
}

export const serverDb = {
  // RESTAURANTS
  getRestaurants: async (): Promise<Restaurant[]> => {
    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      const list = await db.collection<Restaurant>(COLLECTIONS.RESTAURANTS)
        .find({})
        .sort({ name: 1 })
        .toArray();
      return list.map(cleanDoc<Restaurant>);
    }
    return [...memRestaurants];
  },

  getRestaurantBySlug: async (slug: string): Promise<Restaurant | null> => {
    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      const rest = await db.collection<Restaurant>(COLLECTIONS.RESTAURANTS).findOne({
        $or: [{ slug }, { id: slug }]
      });
      return cleanDoc<Restaurant>(rest);
    }
    return memRestaurants.find(r => r.slug === slug || r.id === slug) || null;
  },

  getRestaurantById: async (id: string): Promise<Restaurant | null> => {
    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      const rest = await db.collection<Restaurant>(COLLECTIONS.RESTAURANTS).findOne({
        $or: [{ id }, { slug: id }]
      });
      return cleanDoc<Restaurant>(rest);
    }
    return memRestaurants.find(r => r.id === id || r.slug === id) || null;
  },

  saveRestaurant: async (r: Restaurant): Promise<Restaurant> => {
    const formatted: Restaurant = {
      ...r,
      coverImageUrl: r.coverImageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
      totalSeatingCapacity: Number(r.totalSeatingCapacity) || 40,
      slotDurationMinutes: Number(r.slotDurationMinutes) || 90,
      bufferTimeMinutes: Number(r.bufferTimeMinutes) || 15,
      minPartySize: Number(r.minPartySize) || 1,
      maxPartySize: Number(r.maxPartySize) || 12,
      cancellationCutoffHours: Number(r.cancellationCutoffHours) || 2,
      cancellationPolicy: r.cancellationPolicy || 'Complimentary cancellation up to 2 hours before your booking.',
      createdAt: r.createdAt || new Date().toISOString()
    };

    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      await db.collection(COLLECTIONS.RESTAURANTS).updateOne(
        { id: formatted.id },
        { $set: { ...formatted, _id: formatted.id } },
        { upsert: true }
      );
      return formatted;
    }

    const idx = memRestaurants.findIndex(item => item.id === formatted.id);
    if (idx >= 0) memRestaurants[idx] = formatted;
    else memRestaurants.push(formatted);
    return formatted;
  },

  // TABLES
  getTables: async (restaurantId: string): Promise<DiningTable[]> => {
    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      const list = await db.collection<DiningTable>(COLLECTIONS.TABLES)
        .find({ restaurantId })
        .sort({ tableNumber: 1 })
        .toArray();
      return list.map(cleanDoc<DiningTable>);
    }
    return memTables.filter(t => t.restaurantId === restaurantId);
  },

  saveTable: async (t: DiningTable): Promise<DiningTable> => {
    const tableDoc = {
      ...t,
      capacity: Number(t.capacity) || 2,
      isActive: Boolean(t.isActive),
      shape: t.shape || 'rectangle',
      posX: Number(t.posX ?? 50),
      posY: Number(t.posY ?? 50),
      rotation: Number(t.rotation ?? 0)
    };

    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      await db.collection(COLLECTIONS.TABLES).updateOne(
        { id: tableDoc.id },
        { $set: { ...tableDoc, _id: tableDoc.id } },
        { upsert: true }
      );
      return tableDoc;
    }

    const idx = memTables.findIndex(item => item.id === tableDoc.id);
    if (idx >= 0) memTables[idx] = tableDoc;
    else memTables.push(tableDoc);
    return tableDoc;
  },

  deleteTable: async (id: string): Promise<void> => {
    if (isMongoConfigured()) {
      const db = await getDb();
      await db.collection(COLLECTIONS.TABLES).deleteOne({ id });
      return;
    }
    memTables = memTables.filter(t => t.id !== id);
  },

  // MENU CATEGORIES
  getMenuCategories: async (restaurantId: string): Promise<MenuCategory[]> => {
    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      const list = await db.collection<MenuCategory>(COLLECTIONS.MENU_CATEGORIES)
        .find({ restaurantId })
        .sort({ displayOrder: 1 })
        .toArray();
      return list.map(cleanDoc<MenuCategory>);
    }
    return memCategories.filter(c => c.restaurantId === restaurantId).sort((a, b) => a.displayOrder - b.displayOrder);
  },

  saveMenuCategory: async (c: MenuCategory): Promise<MenuCategory> => {
    const catDoc = {
      ...c,
      displayOrder: Number(c.displayOrder || 0),
      isActive: Boolean(c.isActive)
    };

    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      await db.collection(COLLECTIONS.MENU_CATEGORIES).updateOne(
        { id: catDoc.id },
        { $set: { ...catDoc, _id: catDoc.id } },
        { upsert: true }
      );
      return catDoc;
    }

    const idx = memCategories.findIndex(item => item.id === catDoc.id);
    if (idx >= 0) memCategories[idx] = catDoc;
    else memCategories.push(catDoc);
    return catDoc;
  },

  deleteMenuCategory: async (id: string): Promise<void> => {
    if (isMongoConfigured()) {
      const db = await getDb();
      await db.collection(COLLECTIONS.MENU_CATEGORIES).deleteOne({ id });
      return;
    }
    memCategories = memCategories.filter(c => c.id !== id);
  },

  // MENU ITEMS
  getMenuItems: async (restaurantId: string): Promise<MenuItem[]> => {
    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      const list = await db.collection<MenuItem>(COLLECTIONS.MENU_ITEMS)
        .find({ restaurantId })
        .sort({ displayOrder: 1 })
        .toArray();
      return list.map(cleanDoc<MenuItem>);
    }
    return memMenuItems.filter(m => m.restaurantId === restaurantId).sort((a, b) => a.displayOrder - b.displayOrder);
  },

  saveMenuItem: async (m: MenuItem): Promise<MenuItem> => {
    const itemDoc = {
      ...m,
      price: Number(m.price) || 0,
      displayOrder: Number(m.displayOrder || 0),
      isAvailable: Boolean(m.isAvailable),
      isVegetarian: Boolean(m.isVegetarian),
      isNonVegetarian: Boolean(m.isNonVegetarian),
      isVegan: Boolean(m.isVegan),
      isGlutenFree: Boolean(m.isGlutenFree)
    };

    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      await db.collection(COLLECTIONS.MENU_ITEMS).updateOne(
        { id: itemDoc.id },
        { $set: { ...itemDoc, _id: itemDoc.id } },
        { upsert: true }
      );
      return itemDoc;
    }

    const idx = memMenuItems.findIndex(item => item.id === itemDoc.id);
    if (idx >= 0) memMenuItems[idx] = itemDoc;
    else memMenuItems.push(itemDoc);
    return itemDoc;
  },

  deleteMenuItem: async (id: string): Promise<void> => {
    if (isMongoConfigured()) {
      const db = await getDb();
      await db.collection(COLLECTIONS.MENU_ITEMS).deleteOne({ id });
      return;
    }
    memMenuItems = memMenuItems.filter(m => m.id !== id);
  },

  // RESTAURANT HOURS
  getRestaurantHours: async (restaurantId: string): Promise<RestaurantHours[]> => {
    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      const list = await db.collection<RestaurantHours>(COLLECTIONS.RESTAURANT_HOURS)
        .find({ restaurantId })
        .sort({ dayOfWeek: 1 })
        .toArray();
      return list.map(cleanDoc<RestaurantHours>);
    }
    return memHours.filter(h => h.restaurantId === restaurantId).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  },

  saveRestaurantHours: async (restaurantId: string, hours: RestaurantHours[]): Promise<void> => {
    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      // Replace existing hours for this restaurant
      await db.collection(COLLECTIONS.RESTAURANT_HOURS).deleteMany({ restaurantId });
      if (hours.length > 0) {
        const docs = hours.map(h => ({
          ...h,
          _id: h.id,
          restaurantId,
          dayOfWeek: Number(h.dayOfWeek),
          isClosed: Boolean(h.isClosed)
        }));
        await db.collection<any>(COLLECTIONS.RESTAURANT_HOURS).insertMany(docs);
      }
      return;
    }

    memHours = memHours.filter(h => h.restaurantId !== restaurantId);
    memHours.push(...hours);
  },

  // RESTAURANT CLOSURES
  getRestaurantClosures: async (restaurantId: string): Promise<RestaurantClosure[]> => {
    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      const list = await db.collection<RestaurantClosure>(COLLECTIONS.RESTAURANT_CLOSURES)
        .find({ restaurantId })
        .sort({ closureDate: 1 })
        .toArray();
      return list.map(cleanDoc<RestaurantClosure>);
    }
    return memClosures.filter(c => c.restaurantId === restaurantId);
  },

  getRestaurantClosure: async (restaurantId: string, date: string): Promise<RestaurantClosure | null> => {
    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      const closure = await db.collection<RestaurantClosure>(COLLECTIONS.RESTAURANT_CLOSURES).findOne({
        restaurantId,
        closureDate: date
      });
      return cleanDoc<RestaurantClosure>(closure);
    }
    return memClosures.find(c => c.restaurantId === restaurantId && c.closureDate === date) || null;
  },

  saveRestaurantClosure: async (closure: RestaurantClosure): Promise<RestaurantClosure> => {
    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      await db.collection(COLLECTIONS.RESTAURANT_CLOSURES).updateOne(
        { id: closure.id },
        { $set: { ...closure, _id: closure.id } },
        { upsert: true }
      );
      return closure;
    }
    const idx = memClosures.findIndex(c => c.id === closure.id);
    if (idx >= 0) memClosures[idx] = closure;
    else memClosures.push(closure);
    return closure;
  },

  // RESERVATIONS
  getReservations: async (filter?: { restaurantId?: string; customerId?: string }): Promise<Reservation[]> => {
    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      const query: any = {};
      if (filter?.restaurantId) query.restaurantId = filter.restaurantId;
      if (filter?.customerId) query.customerId = filter.customerId;

      const list = await db.collection<Reservation>(COLLECTIONS.RESERVATIONS)
        .find(query)
        .sort({ reservationDate: -1, startTime: -1 })
        .toArray();
      return list.map(cleanDoc<Reservation>);
    }

    let list = [...memReservations];
    if (filter?.restaurantId) list = list.filter(r => r.restaurantId === filter.restaurantId);
    if (filter?.customerId) list = list.filter(r => r.customerId === filter.customerId);
    return list;
  },

  getReservationById: async (id: string): Promise<Reservation | null> => {
    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      const res = await db.collection<Reservation>(COLLECTIONS.RESERVATIONS).findOne({
        $or: [{ id }, { bookingReference: id }]
      });
      return cleanDoc<Reservation>(res);
    }
    return memReservations.find(r => r.id === id || r.bookingReference === id) || null;
  },

  getActiveBookingForCustomer: async (
    restaurantId: string,
    customerId: string,
    date: string
  ): Promise<Reservation | null> => {
    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      const res = await db.collection<Reservation>(COLLECTIONS.RESERVATIONS).findOne({
        restaurantId,
        customerId,
        reservationDate: date,
        status: { $in: ['pending', 'confirmed'] }
      });
      return cleanDoc<Reservation>(res);
    }
    return memReservations.find(
      r => r.restaurantId === restaurantId &&
           r.customerId === customerId &&
           r.reservationDate === date &&
           ['pending', 'confirmed'].includes(r.status)
    ) || null;
  },

  // CAPACITY & AVAILABILITY ENGINE
  getSlotAvailabilityDetails: async (
    restaurantId: string,
    date: string,
    partySize: number
  ): Promise<SlotAvailabilityResponse> => {
    const rest = await serverDb.getRestaurantById(restaurantId);
    if (!rest) {
      return {
        status: 'error',
        message: `Restaurant with identifier "${restaurantId}" could not be found.`,
        slots: [],
        hours: null
      };
    }

    if (rest.status !== 'published') {
      let statusMsg = 'This restaurant is not currently accepting public reservations.';
      if (rest.status === 'pending_approval') {
        statusMsg = 'This restaurant registration is currently awaiting administrative approval and cannot accept bookings.';
      } else if (rest.status === 'suspended') {
        statusMsg = 'This restaurant is temporarily suspended and reservation booking is paused.';
      } else if (rest.status === 'rejected') {
        statusMsg = 'This restaurant registration is inactive and not available for booking.';
      }
      return {
        status: 'closed',
        message: statusMsg,
        slots: [],
        hours: null,
        restaurant: { id: rest.id, name: rest.name, slug: rest.slug, timezone: rest.timezone }
      };
    }

    if (!date || typeof date !== 'string') {
      return {
        status: 'error',
        message: 'A valid reservation date (YYYY-MM-DD) is required.',
        slots: [],
        hours: null,
        restaurant: { id: rest.id, name: rest.name, slug: rest.slug, timezone: rest.timezone }
      };
    }

    const cleanDate = date.includes('T') ? date.split('T')[0] : date.trim();
    const dateParts = cleanDate.split('-').map(Number);
    if (dateParts.length !== 3 || dateParts.some(isNaN)) {
      return {
        status: 'error',
        message: 'Invalid date format. Expected format: YYYY-MM-DD.',
        slots: [],
        hours: null,
        restaurant: { id: rest.id, name: rest.name, slug: rest.slug, timezone: rest.timezone }
      };
    }

    const [year, month, day] = dateParts;
    const targetDateUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    const dayOfWeek = targetDateUtc.getUTCDay();

    // Holiday/closure check
    const closure = await serverDb.getRestaurantClosure(rest.id, cleanDate);
    if (closure) {
      return {
        status: 'closed',
        message: closure.reason 
          ? `${rest.name} is closed on ${cleanDate} (${closure.reason}).`
          : 'This restaurant is closed on the selected date.',
        slots: [],
        hours: null,
        restaurant: { id: rest.id, name: rest.name, slug: rest.slug, timezone: rest.timezone }
      };
    }

    // Opening hours check
    const hours = await serverDb.getRestaurantHours(rest.id);
    const dayHours = hours.find(h => h.dayOfWeek === dayOfWeek);

    if (!dayHours || dayHours.isClosed) {
      return {
        status: 'closed',
        message: `This restaurant is closed on ${DAY_NAMES[dayOfWeek]}.`,
        slots: [],
        hours: dayHours || null,
        restaurant: { id: rest.id, name: rest.name, slug: rest.slug, timezone: rest.timezone }
      };
    }

    const openMinutes = timeToMinutes(dayHours.openTime);
    let closeMinutes = timeToMinutes(dayHours.closeTime);
    if (closeMinutes <= openMinutes) {
      closeMinutes += 24 * 60; // overnight hours support
    }

    const slotDuration = rest.slotDurationMinutes || 90;
    const intervalMinutes = 30;

    const slotTimes: string[] = [];
    for (let m = openMinutes; m + slotDuration <= closeMinutes; m += intervalMinutes) {
      slotTimes.push(minutesToTime(m % (24 * 60)));
    }

    if (slotTimes.length === 0) {
      return {
        status: 'no_slots',
        message: 'No reservation times are available for this date.',
        slots: [],
        hours: dayHours,
        restaurant: { id: rest.id, name: rest.name, slug: rest.slug, timezone: rest.timezone }
      };
    }

    const tables = (await serverDb.getTables(rest.id)).filter(t => t.isActive);
    const totalCapacity = rest.totalSeatingCapacity || 40;

    // Fetch active reservations for this calendar date
    const allReservations = await serverDb.getReservations({ restaurantId: rest.id });
    const dateReservations = allReservations.filter(
      r => r.reservationDate === cleanDate && r.status !== 'cancelled' && r.status !== 'no_show'
    );

    // Filter past times if date is today
    const restaurantTimezone = rest.timezone || 'America/New_York';
    let isTodayAtRestaurant = false;
    let currentRestaurantMinutes = -1;
    try {
      const nowFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: restaurantTimezone });
      const todayInTz = nowFormatter.format(new Date());
      isTodayAtRestaurant = (cleanDate === todayInTz);
      if (isTodayAtRestaurant) {
        const timeFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: restaurantTimezone,
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        });
        const [currH, currM] = timeFormatter.format(new Date()).split(':').map(Number);
        currentRestaurantMinutes = currH * 60 + currM;
      }
    } catch {
      // Default to UTC comparison
    }

    const slots: TimeSlotAvailability[] = [];

    for (const time of slotTimes) {
      const slotStart = timeToMinutes(time);
      const slotEnd = slotStart + slotDuration;

      // 1. Check if slot has already passed today
      if (isTodayAtRestaurant && currentRestaurantMinutes > -1 && slotStart <= currentRestaurantMinutes + 30) {
        slots.push({
          time,
          formattedTime: formatTime12h(time),
          isAvailable: false,
          reason: 'Time slot has already passed',
          remainingSeats: 0,
          maxPartyAllowed: 0
        });
        continue;
      }

      // 2. Overlapping active reservations
      const overlappingReservations = dateReservations.filter(res => {
        const resStart = timeToMinutes(res.startTime);
        const resEnd = timeToMinutes(res.endTime);
        return slotStart < resEnd && slotEnd > resStart;
      });

      // Total seats booked during this window
      const bookedSeats = overlappingReservations.reduce((sum, res) => sum + (res.partySize || 0), 0);
      const remainingSeats = Math.max(0, totalCapacity - bookedSeats);

      // Check mode
      if (rest.seatingManagementMode === 'individual_tables' && tables.length > 0) {
        const reservedTableIds = new Set(overlappingReservations.map(r => r.assignedTableId).filter(Boolean));
        const availableTables = tables.filter(t => !reservedTableIds.has(t.id));

        const fittingTable = availableTables.find(t => t.capacity >= partySize);
        const maxCapacityAvailable = availableTables.length > 0 ? Math.max(...availableTables.map(t => t.capacity)) : 0;

        if (partySize > totalCapacity) {
          slots.push({
            time,
            formattedTime: formatTime12h(time),
            isAvailable: false,
            reason: `Requested party of ${partySize} exceeds restaurant total capacity (${totalCapacity} seats).`,
            remainingSeats: 0,
            maxPartyAllowed: 0
          });
        } else if (!fittingTable) {
          slots.push({
            time,
            formattedTime: formatTime12h(time),
            isAvailable: false,
            reason: availableTables.length === 0
              ? 'All dining tables fully booked for this slot'
              : `Largest available table accommodates ${maxCapacityAvailable} guests`,
            remainingSeats,
            maxPartyAllowed: maxCapacityAvailable
          });
        } else {
          slots.push({
            time,
            formattedTime: formatTime12h(time),
            isAvailable: true,
            remainingSeats,
            maxPartyAllowed: maxCapacityAvailable,
            suggestedTableId: fittingTable.id
          });
        }
      } else {
        // Total capacity mode
        if (partySize > remainingSeats) {
          slots.push({
            time,
            formattedTime: formatTime12h(time),
            isAvailable: false,
            reason: remainingSeats <= 0 ? 'Fully booked' : `Only ${remainingSeats} seats remaining`,
            remainingSeats,
            maxPartyAllowed: remainingSeats
          });
        } else {
          slots.push({
            time,
            formattedTime: formatTime12h(time),
            isAvailable: true,
            remainingSeats,
            maxPartyAllowed: remainingSeats
          });
        }
      }
    }

    return {
      status: 'available',
      message: `Found ${slots.filter(s => s.isAvailable).length} available time slots.`,
      slots,
      hours: dayHours,
      restaurant: { id: rest.id, name: rest.name, slug: rest.slug, timezone: rest.timezone }
    };
  },

  checkSlotAvailability: async (restaurantId: string, date: string, partySize: number): Promise<TimeSlotAvailability[]> => {
    const details = await serverDb.getSlotAvailabilityDetails(restaurantId, date, partySize);
    return details.slots;
  },

  getTableSeatsAvailability: async (
    restaurantId: string,
    date: string,
    time: string = '19:00',
    partySize: number = 2
  ): Promise<TableSeatStatus[]> => {
    const rest = await serverDb.getRestaurantById(restaurantId);
    const slotDuration = rest?.slotDurationMinutes || 90;
    const startMins = timeToMinutes(time);
    const endMins = startMins + slotDuration;

    const tables = await serverDb.getTables(restaurantId);
    const allReservations = await serverDb.getReservations({ restaurantId });
    const dateReservations = allReservations.filter(
      r => r.reservationDate === date && r.status !== 'cancelled' && r.status !== 'no_show'
    );

    const now = Date.now();

    return tables.map(table => {
      const overlappingRes = dateReservations.find(res => {
        if (res.assignedTableId !== table.id) return false;
        const resStart = timeToMinutes(res.startTime);
        const resEnd = timeToMinutes(res.endTime);
        return startMins < resEnd && endMins > resStart;
      });

      const holdKey = `${restaurantId}_${date}_${time}_${table.id}`;
      const activeHold = seatHolds.get(holdKey);
      const isHeld = activeHold ? activeHold.expiresAt > now : false;

      let status: TableSeatStatus['status'] = 'available';
      if (!table.isActive) status = 'unavailable';
      else if (overlappingRes) status = 'booked';
      else if (isHeld) status = 'held';

      const seats = Array.from({ length: table.capacity }, (_, idx) => {
        const seatNumber = idx + 1;
        const seatHoldKey = `${holdKey}_s${seatNumber}`;
        const seatHeld = seatHolds.get(seatHoldKey);
        const isSeatHeld = seatHeld ? seatHeld.expiresAt > now : false;

        let seatStatus: TableSeatStatus['status'] = status;
        if (overlappingRes && overlappingRes.assignedSeatNumbers) {
          seatStatus = overlappingRes.assignedSeatNumbers.includes(seatNumber) ? 'booked' : 'available';
        } else if (isSeatHeld) {
          seatStatus = 'held';
        }

        return {
          seatNumber,
          seatId: `${table.id}-s${seatNumber}`,
          status: seatStatus
        };
      });

      return {
        tableId: table.id,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        shape: table.shape || 'rectangle',
        locationArea: table.locationArea,
        isActive: table.isActive,
        posX: table.posX ?? 50,
        posY: table.posY ?? 50,
        status,
        heldExpiresAt: isHeld ? activeHold?.expiresAt : undefined,
        bookedByReference: overlappingRes?.bookingReference,
        seats
      };
    });
  },

  holdSeats: (data: {
    restaurantId: string;
    date: string;
    time: string;
    tableId: string;
    seatNumbers?: number[];
    holdDurationMinutes?: number;
  }): { success: boolean; holdToken?: string; expiresAt?: number; error?: string } => {
    const durationMs = (data.holdDurationMinutes || 10) * 60 * 1000;
    const expiresAt = Date.now() + durationMs;
    const holdToken = `hold_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const holdKey = `${data.restaurantId}_${data.date}_${data.time}_${data.tableId}`;
    const existing = seatHolds.get(holdKey);
    if (existing && existing.expiresAt > Date.now()) {
      return { success: false, error: 'Table is currently held by another guest. Please select another table.' };
    }

    seatHolds.set(holdKey, { token: holdToken, expiresAt });
    if (data.seatNumbers) {
      for (const s of data.seatNumbers) {
        seatHolds.set(`${holdKey}_s${s}`, { token: holdToken, expiresAt });
      }
    }

    return { success: true, holdToken, expiresAt };
  },

  releaseHold: (restaurantId: string, date: string, time: string, tableId: string, holdToken?: string): void => {
    const holdKey = `${restaurantId}_${date}_${time}_${tableId}`;
    const existing = seatHolds.get(holdKey);
    if (existing && (!holdToken || existing.token === holdToken)) {
      seatHolds.delete(holdKey);
    }
  },

  // BOOKING CREATION WITH ATOMIC OVERBOOKING & PRICING VERIFICATION
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
    const restaurant = await serverDb.getRestaurantById(data.restaurantId);
    if (!restaurant) {
      return { success: false, error: 'Restaurant not found.' };
    }

    if (restaurant.status !== 'published') {
      let statusMsg = 'This restaurant is not currently available for reservations.';
      if (restaurant.status === 'pending_approval') {
        statusMsg = 'This restaurant registration is awaiting admin approval and cannot accept bookings yet.';
      } else if (restaurant.status === 'suspended') {
        statusMsg = 'This restaurant is currently suspended and bookings are paused.';
      } else if (restaurant.status === 'rejected') {
        statusMsg = 'This restaurant registration is inactive.';
      }
      return { success: false, error: statusMsg };
    }

    const reservationDate = (data.reservationDate || (data as any).date || '').trim();
    if (!reservationDate) {
      return { success: false, error: 'A valid reservation date (YYYY-MM-DD) is required.' };
    }
    const customerId = data.customerId || (data.customerEmail ? 'cust-' + data.customerEmail.toLowerCase().replace(/[^a-z0-9]/g, '') : `cust-${Date.now()}`);
    data.reservationDate = reservationDate;
    data.customerId = customerId;

    if (data.partySize < (restaurant.minPartySize || 1)) {
      return { success: false, error: `Party size must be at least ${restaurant.minPartySize}.` };
    }
    if (data.partySize > (restaurant.maxPartySize || 20)) {
      return { success: false, error: `Party size cannot exceed ${restaurant.maxPartySize}.` };
    }

    // Duplicate booking check for same customer + restaurant + date + time
    const existingReservations = await serverDb.getReservations({ restaurantId: restaurant.id, customerId: data.customerId });
    const duplicate = existingReservations.find(
      r => r.reservationDate === data.reservationDate && r.startTime === data.startTime && ['pending', 'confirmed'].includes(r.status)
    );
    if (duplicate) {
      return {
        success: false,
        error: `You already have an active booking (${duplicate.bookingReference}) for this restaurant at ${data.startTime}.`
      };
    }

    // Verify slot capacity against real database records
    const availability = await serverDb.getSlotAvailabilityDetails(restaurant.id, data.reservationDate, data.partySize);
    if (availability.status !== 'available') {
      return {
        success: false,
        error: availability.message || 'The restaurant is not accepting reservations on this date.'
      };
    }

    const targetSlot = availability.slots.find(s => s.time === data.startTime);
    if (!targetSlot || !targetSlot.isAvailable) {
      return {
        success: false,
        error: targetSlot?.reason || 'Selected time slot is no longer available. Please choose another time.'
      };
    }

    const slotDuration = restaurant.slotDurationMinutes || 90;
    const startMins = timeToMinutes(data.startTime);
    const endMins = startMins + slotDuration;
    const endTime = minutesToTime(endMins);

    // Validate table assignment and double-booking
    let assignedTableId = data.selectedTableId || targetSlot.suggestedTableId;
    let assignedTableName: string | undefined;
    let assignedSeatNumbers: number[] | undefined = data.selectedSeats;

    if (assignedTableId) {
      const tables = await serverDb.getTables(data.restaurantId);
      const tab = tables.find(t => t.id === assignedTableId);
      if (!tab || !tab.isActive) {
        return { success: false, error: 'The selected table is currently unavailable or inactive.' };
      }

      // Check overlapping table reservation
      const restReservations = await serverDb.getReservations({ restaurantId: data.restaurantId });
      const overlappingRes = restReservations.find(res => {
        if (res.reservationDate !== data.reservationDate || res.assignedTableId !== assignedTableId) return false;
        if (res.status === 'cancelled' || res.status === 'no_show') return false;
        const resStart = timeToMinutes(res.startTime);
        const resEnd = timeToMinutes(res.endTime);
        return startMins < resEnd && endMins > resStart;
      });

      if (overlappingRes) {
        return {
          success: false,
          error: `Table ${tab.tableNumber} was just reserved by another guest for this time window. Please select another table.`
        };
      }

      assignedTableName = `${tab.tableNumber} (Cap: ${tab.capacity})`;
      if (!assignedSeatNumbers || assignedSeatNumbers.length === 0) {
        assignedSeatNumbers = Array.from({ length: Math.min(data.partySize, tab.capacity) }, (_, i) => i + 1);
      }
    }

    // Server-side food pre-order calculation
    const menuItems = await serverDb.getMenuItems(data.restaurantId);
    const preOrderItems: Reservation['items'] = [];
    let subtotal = 0;

    if (data.items && data.items.length > 0) {
      for (const reqItem of data.items) {
        const found = menuItems.find(m => m.id === reqItem.menuItemId);
        if (!found) {
          return {
            success: false,
            error: `Selected dish (${reqItem.menuItemId}) is not available on this restaurant's menu.`
          };
        }
        if (!found.isAvailable) {
          return {
            success: false,
            error: `Item "${found.name}" is currently unavailable and cannot be pre-ordered.`
          };
        }
        const itemTotal = Number((found.price * reqItem.quantity).toFixed(2));
        subtotal += itemTotal;
        preOrderItems.push({
          menuItemId: found.id,
          name: found.name,
          price: found.price,
          quantity: reqItem.quantity
        });
      }
    }

    subtotal = Number(subtotal.toFixed(2));
    const tax = Number((subtotal * 0.08875).toFixed(2));
    const estimatedTotal = Number((subtotal + tax).toFixed(2));

    const prefix = restaurant.slug.substring(0, 2).toUpperCase();
    const rand = Math.floor(100000 + Math.random() * 900000);
    const bookingReference = `${prefix}-${rand}`;
    const reservationId = `res-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const newReservation: Reservation = {
      id: reservationId,
      bookingReference,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      restaurantSlug: restaurant.slug,
      customerId: data.customerId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      partySize: data.partySize,
      reservationDate: data.reservationDate,
      startTime: data.startTime,
      endTime,
      status: restaurant.requiresManualApproval ? 'pending' : 'confirmed',
      assignedTableId,
      assignedTableName,
      assignedSeatNumbers,
      specialRequests: data.specialRequests,
      orderSubtotal: subtotal,
      orderTax: tax,
      estimatedTotal,
      items: preOrderItems,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      await db.collection<any>(COLLECTIONS.RESERVATIONS).insertOne({
        ...newReservation,
        _id: newReservation.id
      });
    } else {
      memReservations.unshift(newReservation);
    }

    // Release temporary hold if applicable
    if (assignedTableId) {
      serverDb.releaseHold(data.restaurantId, data.reservationDate, data.startTime, assignedTableId, data.holdToken);
    }

    return { success: true, reservation: newReservation };
  },

  updateReservationStatus: async (
    id: string,
    status: ReservationStatus,
    cancellationReason?: string
  ): Promise<Reservation | null> => {
    const nowIso = new Date().toISOString();
    const updateFields: any = {
      status,
      updatedAt: nowIso
    };
    if (status === 'cancelled') {
      updateFields.cancelledAt = nowIso;
      if (cancellationReason) updateFields.cancellationReason = cancellationReason;
    }

    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      const res = await db.collection<Reservation>(COLLECTIONS.RESERVATIONS).findOneAndUpdate(
        { $or: [{ id }, { bookingReference: id }] },
        { $set: updateFields },
        { returnDocument: 'after' }
      );
      return cleanDoc<Reservation>(res);
    }

    const idx = memReservations.findIndex(r => r.id === id || r.bookingReference === id);
    if (idx >= 0) {
      memReservations[idx] = {
        ...memReservations[idx],
        ...updateFields
      };
      return memReservations[idx];
    }
    return null;
  },

  assignReservationTable: async (reservationId: string, tableId: string): Promise<Reservation | null> => {
    const existing = await serverDb.getReservationById(reservationId);
    if (!existing) return null;

    const tables = await serverDb.getTables(existing.restaurantId);
    const table = tables.find(t => t.id === tableId);
    const assignedTableName = table ? `${table.tableNumber} (Cap: ${table.capacity})` : undefined;

    const updateFields = {
      assignedTableId: tableId,
      assignedTableName,
      updatedAt: new Date().toISOString()
    };

    if (isMongoConfigured()) {
      const db = await getDb();
      const res = await db.collection<Reservation>(COLLECTIONS.RESERVATIONS).findOneAndUpdate(
        { id: existing.id },
        { $set: updateFields },
        { returnDocument: 'after' }
      );
      return cleanDoc<Reservation>(res);
    }

    const idx = memReservations.findIndex(r => r.id === existing.id);
    if (idx >= 0) {
      memReservations[idx] = { ...memReservations[idx], ...updateFields };
      return memReservations[idx];
    }
    return null;
  },

  // USERS & AUTHENTICATION
  getUsers: async (): Promise<UserProfile[]> => {
    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      const list = await db.collection<UserProfile>(COLLECTIONS.USERS).find({}).toArray();
      return list.map(cleanDoc<UserProfile>);
    }
    return [...memUsers];
  },

  getUserById: async (id: string): Promise<UserProfile | null> => {
    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      const user = await db.collection<UserProfile>(COLLECTIONS.USERS).findOne({ id });
      return cleanDoc<UserProfile>(user);
    }
    return memUsers.find(u => u.id === id) || null;
  },

  getUserByEmail: async (email: string): Promise<UserProfile | null> => {
    const cleanEmail = email.trim().toLowerCase();
    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      const user = await db.collection<UserProfile>(COLLECTIONS.USERS).findOne({
        email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') }
      });
      return cleanDoc<UserProfile>(user);
    }
    return memUsers.find(u => u.email.toLowerCase() === cleanEmail) || null;
  },

  saveUser: async (u: UserProfile): Promise<UserProfile> => {
    const userDoc: UserProfile = {
      ...u,
      email: u.email.trim().toLowerCase(),
      createdAt: u.createdAt || new Date().toISOString()
    };

    // If password is plain text, hash it securely before persistence
    if (userDoc.password && isLegacyPlainText(userDoc.password)) {
      userDoc.password = await hashPassword(userDoc.password);
    }

    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      await db.collection(COLLECTIONS.USERS).updateOne(
        { id: userDoc.id },
        { $set: { ...userDoc, _id: userDoc.id } },
        { upsert: true }
      );
      return userDoc;
    }

    const idx = memUsers.findIndex(item => item.id === userDoc.id || item.email.toLowerCase() === userDoc.email);
    if (idx >= 0) memUsers[idx] = userDoc;
    else memUsers.push(userDoc);
    return userDoc;
  },

  hasAnyAdmin: async (): Promise<boolean> => {
    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      const count = await db.collection(COLLECTIONS.USERS).countDocuments({ role: 'admin' });
      return count > 0;
    }
    return memUsers.some(u => u.role === 'admin');
  },

  // ADMIN ANALYTICS & RESTAURANT GOVERNANCE
  getAdminStats: async () => {
    const restaurants = await serverDb.getRestaurants();
    const reservations = await serverDb.getReservations();
    const users = await serverDb.getUsers();

    return {
      totalRestaurants: restaurants.length,
      pendingApprovals: restaurants.filter(r => r.status === 'pending_approval').length,
      approvedRestaurants: restaurants.filter(r => r.status === 'published').length,
      rejectedRegistrations: restaurants.filter(r => r.status === 'rejected').length,
      suspendedRestaurants: restaurants.filter(r => r.status === 'suspended').length,
      totalReservations: reservations.length,
      totalCustomers: users.filter(u => u.role === 'customer').length
    };
  },

  updateRestaurantApprovalStatus: async (
    restaurantId: string,
    status: RestaurantStatus,
    metadata?: {
      adminId?: string;
      reason?: string;
    }
  ): Promise<Restaurant | null> => {
    const existing = await serverDb.getRestaurantById(restaurantId);
    if (!existing) return null;

    const nowIso = new Date().toISOString();
    const updateData: Partial<Restaurant> = {
      status,
      reviewedByAdminId: metadata?.adminId || existing.reviewedByAdminId,
      reviewedAt: nowIso
    };

    if (status === 'rejected') {
      updateData.rejectionReason = metadata?.reason || 'Registration did not meet guidelines.';
    } else if (status === 'suspended') {
      updateData.suspendedAt = nowIso;
      updateData.suspendedReason = metadata?.reason || 'Temporarily suspended by administrator.';
    } else if (status === 'published') {
      updateData.suspendedAt = undefined;
      updateData.suspendedReason = undefined;
      updateData.rejectionReason = undefined;
    }

    const updated = { ...existing, ...updateData };
    return await serverDb.saveRestaurant(updated);
  },

  getAdminRestaurants: async (filter?: { status?: string; search?: string }) => {
    const restaurants = await serverDb.getRestaurants();
    const users = await serverDb.getUsers();

    let filtered = restaurants;
    if (filter?.status && filter.status !== 'all') {
      filtered = filtered.filter(r => r.status === filter.status);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.cuisineType.some(c => c.toLowerCase().includes(q))
      );
    }

    return Promise.all(filtered.map(async r => {
      const owner = users.find(u => u.id === r.ownerId);
      const tables = await serverDb.getTables(r.id);
      return {
        ...r,
        owner,
        tableCount: tables.length
      };
    }));
  },

  // RATINGS & REVIEWS ENGINE
  recalculateRestaurantRating: async (restaurantId: string): Promise<{ rating: number; reviewCount: number }> => {
    const reviews = await serverDb.getReviews({ restaurantId });
    if (reviews.length === 0) {
      return { rating: 5.0, reviewCount: 0 };
    }

    const total = reviews.reduce((sum, r) => sum + r.overallRating, 0);
    const avg = Number((total / reviews.length).toFixed(1));
    const count = reviews.length;

    const rest = await serverDb.getRestaurantById(restaurantId);
    if (rest) {
      rest.rating = avg;
      rest.reviewCount = count;
      await serverDb.saveRestaurant(rest);
    }

    return { rating: avg, reviewCount: count };
  },

  getReviewStats: async (restaurantId: string): Promise<ReviewStats> => {
    const reviews = await serverDb.getReviews({ restaurantId });
    if (reviews.length === 0) {
      return {
        averageRating: 5.0,
        reviewCount: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        avgFood: 5.0,
        avgService: 5.0,
        avgAmbience: 5.0,
        avgValue: 5.0
      };
    }

    const distribution: { [star: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sumOverall = 0;
    let sumFood = 0, countFood = 0;
    let sumService = 0, countService = 0;
    let sumAmbience = 0, countAmbience = 0;
    let sumValue = 0, countValue = 0;

    for (const r of reviews) {
      const star = Math.max(1, Math.min(5, Math.round(r.overallRating)));
      distribution[star] = (distribution[star] || 0) + 1;
      sumOverall += r.overallRating;

      if (r.foodRating) { sumFood += r.foodRating; countFood++; }
      if (r.serviceRating) { sumService += r.serviceRating; countService++; }
      if (r.ambienceRating) { sumAmbience += r.ambienceRating; countAmbience++; }
      if (r.valueRating) { sumValue += r.valueRating; countValue++; }
    }

    return {
      averageRating: Number((sumOverall / reviews.length).toFixed(1)),
      reviewCount: reviews.length,
      distribution,
      avgFood: countFood ? Number((sumFood / countFood).toFixed(1)) : undefined,
      avgService: countService ? Number((sumService / countService).toFixed(1)) : undefined,
      avgAmbience: countAmbience ? Number((sumAmbience / countAmbience).toFixed(1)) : undefined,
      avgValue: countValue ? Number((sumValue / countValue).toFixed(1)) : undefined
    };
  },

  getReviews: async (filter: {
    restaurantId?: string;
    customerId?: string;
    minRating?: number;
    sort?: 'recent' | 'highest' | 'lowest';
  }): Promise<Review[]> => {
    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      const query: any = {};
      if (filter.restaurantId) query.restaurantId = filter.restaurantId;
      if (filter.customerId) query.customerId = filter.customerId;
      if (filter.minRating) query.overallRating = { $gte: filter.minRating };

      const sortOption: any = {};
      if (filter.sort === 'highest') sortOption.overallRating = -1;
      else if (filter.sort === 'lowest') sortOption.overallRating = 1;
      else sortOption.createdAt = -1;

      const list = await db.collection<Review>(COLLECTIONS.REVIEWS)
        .find(query)
        .sort(sortOption)
        .toArray();
      return list.map(cleanDoc<Review>);
    }

    let list = [...memReviews];
    if (filter.restaurantId) list = list.filter(r => r.restaurantId === filter.restaurantId);
    if (filter.customerId) list = list.filter(r => r.customerId === filter.customerId);
    if (filter.minRating !== undefined) list = list.filter(r => r.overallRating >= filter.minRating!);

    if (filter.sort === 'highest') list.sort((a, b) => b.overallRating - a.overallRating);
    else if (filter.sort === 'lowest') list.sort((a, b) => a.overallRating - b.overallRating);
    else list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return list;
  },

  getReviewById: async (id: string): Promise<Review | null> => {
    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      const review = await db.collection<Review>(COLLECTIONS.REVIEWS).findOne({ id });
      return cleanDoc<Review>(review);
    }
    return memReviews.find(r => r.id === id) || null;
  },

  getReviewByReservationId: async (reservationId: string): Promise<Review | null> => {
    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      const review = await db.collection<Review>(COLLECTIONS.REVIEWS).findOne({ reservationId });
      return cleanDoc<Review>(review);
    }
    return memReviews.find(r => r.reservationId === reservationId) || null;
  },

  createReview: async (data: {
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
    const reservation = await serverDb.getReservationById(data.reservationId);
    if (!reservation) {
      return { success: false, error: 'Valid completed reservation required to leave a review.' };
    }

    if (reservation.customerId !== data.customerId) {
      return { success: false, error: 'Unauthorized: You may only review reservations made by your account.' };
    }

    if (reservation.status !== 'completed') {
      return {
        success: false,
        error: `Only completed dining reservations can be reviewed (Current reservation status: "${reservation.status}").`
      };
    }

    const rest = await serverDb.getRestaurantById(data.restaurantId);
    if (!rest || rest.id !== reservation.restaurantId) {
      return { success: false, error: 'Reservation does not match this restaurant.' };
    }

    const existing = await serverDb.getReviewByReservationId(data.reservationId);
    if (existing) {
      return { success: false, error: 'You have already submitted a review for this dining reservation.' };
    }

    if (!data.overallRating || data.overallRating < 1 || data.overallRating > 5) {
      return { success: false, error: 'An overall rating between 1 and 5 stars is required.' };
    }

    const id = `rev-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const newReview: Review = {
      id,
      restaurantId: data.restaurantId,
      customerId: data.customerId,
      customerName: data.customerName || reservation.customerName,
      customerEmail: data.customerEmail || reservation.customerEmail,
      reservationId: data.reservationId,
      overallRating: Math.round(data.overallRating),
      foodRating: data.foodRating ? Math.round(data.foodRating) : undefined,
      serviceRating: data.serviceRating ? Math.round(data.serviceRating) : undefined,
      ambienceRating: data.ambienceRating ? Math.round(data.ambienceRating) : undefined,
      valueRating: data.valueRating ? Math.round(data.valueRating) : undefined,
      comment: data.comment,
      tags: data.tags,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    if (isMongoConfigured()) {
      await ensureMongoSeeded();
      const db = await getDb();
      await db.collection<any>(COLLECTIONS.REVIEWS).insertOne({
        ...newReview,
        _id: newReview.id
      });
    } else {
      memReviews.unshift(newReview);
    }

    await serverDb.recalculateRestaurantRating(data.restaurantId);
    return { success: true, review: newReview };
  },

  updateReview: async (
    id: string,
    customerId: string,
    data: {
      overallRating?: number;
      foodRating?: number;
      serviceRating?: number;
      ambienceRating?: number;
      valueRating?: number;
      comment?: string;
      tags?: string[];
    }
  ): Promise<{ success: boolean; review?: Review; error?: string }> => {
    const existing = await serverDb.getReviewById(id);
    if (!existing) return { success: false, error: 'Review not found.' };
    if (existing.customerId !== customerId) return { success: false, error: 'Unauthorized to edit this review.' };

    const updated: Review = {
      ...existing,
      overallRating: data.overallRating !== undefined ? Math.round(data.overallRating) : existing.overallRating,
      foodRating: data.foodRating !== undefined ? Math.round(data.foodRating) : existing.foodRating,
      serviceRating: data.serviceRating !== undefined ? Math.round(data.serviceRating) : existing.serviceRating,
      ambienceRating: data.ambienceRating !== undefined ? Math.round(data.ambienceRating) : existing.ambienceRating,
      valueRating: data.valueRating !== undefined ? Math.round(data.valueRating) : existing.valueRating,
      comment: data.comment !== undefined ? data.comment : existing.comment,
      tags: data.tags !== undefined ? data.tags : existing.tags,
      updatedAt: new Date().toISOString()
    };

    if (isMongoConfigured()) {
      const db = await getDb();
      await db.collection(COLLECTIONS.REVIEWS).updateOne({ id }, { $set: updated });
    } else {
      const idx = memReviews.findIndex(r => r.id === id);
      if (idx >= 0) memReviews[idx] = updated;
    }

    await serverDb.recalculateRestaurantRating(existing.restaurantId);
    return { success: true, review: updated };
  },

  deleteReview: async (id: string, customerId: string): Promise<{ success: boolean; error?: string }> => {
    const existing = await serverDb.getReviewById(id);
    if (!existing) return { success: false, error: 'Review not found.' };
    if (existing.customerId !== customerId) return { success: false, error: 'Unauthorized to delete this review.' };

    if (isMongoConfigured()) {
      const db = await getDb();
      await db.collection(COLLECTIONS.REVIEWS).deleteOne({ id });
    } else {
      memReviews = memReviews.filter(r => r.id !== id);
    }

    await serverDb.recalculateRestaurantRating(existing.restaurantId);
    return { success: true };
  },

  respondToReview: async (
    reviewId: string,
    ownerId: string,
    responseText: string
  ): Promise<{ success: boolean; review?: Review; error?: string }> => {
    const review = await serverDb.getReviewById(reviewId);
    if (!review) return { success: false, error: 'Review not found.' };

    const rest = await serverDb.getRestaurantById(review.restaurantId);
    if (!rest || rest.ownerId !== ownerId) {
      return { success: false, error: 'Unauthorized: Only the restaurant owner can post an official response.' };
    }

    const nowIso = new Date().toISOString();
    const updateData = {
      ownerResponse: responseText,
      ownerRespondedAt: nowIso,
      updatedAt: nowIso
    };

    if (isMongoConfigured()) {
      const db = await getDb();
      const updated = await db.collection<Review>(COLLECTIONS.REVIEWS).findOneAndUpdate(
        { id: reviewId },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      return { success: true, review: cleanDoc<Review>(updated) };
    }

    const idx = memReviews.findIndex(r => r.id === reviewId);
    if (idx >= 0) {
      memReviews[idx] = { ...memReviews[idx], ...updateData };
      return { success: true, review: memReviews[idx] };
    }
    return { success: false, error: 'Review not found.' };
  },

  reportReview: async (
    reviewId: string,
    reporterId: string,
    reason: string
  ): Promise<{ success: boolean; review?: Review; error?: string }> => {
    const review = await serverDb.getReviewById(reviewId);
    if (!review) return { success: false, error: 'Review not found.' };

    const nowIso = new Date().toISOString();
    const updateData = {
      isReported: true,
      reportReason: reason || 'Flagged for moderation by community user',
      reportedAt: nowIso,
      updatedAt: nowIso
    };

    if (isMongoConfigured()) {
      const db = await getDb();
      const updated = await db.collection<Review>(COLLECTIONS.REVIEWS).findOneAndUpdate(
        { id: reviewId },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      return { success: true, review: cleanDoc<Review>(updated) };
    }

    const idx = memReviews.findIndex(r => r.id === reviewId);
    if (idx >= 0) {
      memReviews[idx] = { ...memReviews[idx], ...updateData };
      return { success: true, review: memReviews[idx] };
    }
    return { success: false, error: 'Review not found.' };
  }
};

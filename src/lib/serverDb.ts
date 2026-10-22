import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
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

// Ensure data folder exists
const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'tablereserve.db');
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL'); // High performance concurrency

// Initialize SQL tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    fullName TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL,
    password TEXT,
    ownedRestaurantId TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS restaurants (
    id TEXT PRIMARY KEY,
    ownerId TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    tagline TEXT,
    description TEXT,
    cuisineType TEXT NOT NULL, -- JSON array
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    postalCode TEXT,
    coverImageUrl TEXT,
    logoUrl TEXT,
    priceTier TEXT NOT NULL,
    seatingManagementMode TEXT NOT NULL,
    totalSeatingCapacity INTEGER NOT NULL,
    slotDurationMinutes INTEGER NOT NULL DEFAULT 90,
    bufferTimeMinutes INTEGER NOT NULL DEFAULT 15,
    advanceBookingDays INTEGER NOT NULL DEFAULT 30,
    minPartySize INTEGER NOT NULL DEFAULT 1,
    maxPartySize INTEGER NOT NULL DEFAULT 20,
    cancellationPolicy TEXT,
    cancellationCutoffHours INTEGER NOT NULL DEFAULT 2,
    requiresManualApproval INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'published',
    rating REAL DEFAULT 4.9,
    reviewCount INTEGER DEFAULT 120,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS restaurant_hours (
    id TEXT PRIMARY KEY,
    restaurantId TEXT NOT NULL,
    dayOfWeek INTEGER NOT NULL,
    openTime TEXT NOT NULL,
    closeTime TEXT NOT NULL,
    isClosed INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS tables (
    id TEXT PRIMARY KEY,
    restaurantId TEXT NOT NULL,
    tableNumber TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    locationArea TEXT,
    isActive INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS menu_categories (
    id TEXT PRIMARY KEY,
    restaurantId TEXT NOT NULL,
    name TEXT NOT NULL,
    displayOrder INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    isActive INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY,
    restaurantId TEXT NOT NULL,
    categoryId TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    imageUrl TEXT,
    isAvailable INTEGER NOT NULL DEFAULT 1,
    isVegetarian INTEGER NOT NULL DEFAULT 0,
    isVegan INTEGER NOT NULL DEFAULT 0,
    isGlutenFree INTEGER NOT NULL DEFAULT 0,
    preparationNotes TEXT,
    displayOrder INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    bookingReference TEXT UNIQUE NOT NULL,
    restaurantId TEXT NOT NULL,
    restaurantName TEXT,
    restaurantSlug TEXT,
    customerId TEXT NOT NULL,
    customerName TEXT NOT NULL,
    customerEmail TEXT NOT NULL,
    customerPhone TEXT NOT NULL,
    partySize INTEGER NOT NULL,
    reservationDate TEXT NOT NULL,
    startTime TEXT NOT NULL,
    endTime TEXT NOT NULL,
    status TEXT NOT NULL,
    assignedTableId TEXT,
    assignedTableName TEXT,
    specialRequests TEXT,
    orderSubtotal REAL NOT NULL DEFAULT 0,
    orderTax REAL NOT NULL DEFAULT 0,
    estimatedTotal REAL NOT NULL DEFAULT 0,
    items TEXT NOT NULL, -- JSON array
    cancellationReason TEXT,
    cancelledAt TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`);

// Seed Initial Data if database is freshly created
const userCount = (sqlite.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
if (userCount === 0) {
  // Seed Users
  const insertUser = sqlite.prepare(`
    INSERT INTO users (id, email, fullName, phone, role, password, ownedRestaurantId, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertUser.run('cust-1', 'customer@demo.com', 'Eleanor Vance', '+1 (555) 234-9988', 'customer', 'password123', null, new Date().toISOString());
  insertUser.run('owner-1', 'owner@losteria.com', 'Chef Marco Bellini', '+1 (555) 349-8201', 'restaurant_owner', 'password123', 'rest-1', new Date().toISOString());
  insertUser.run('owner-2', 'owner@saffron.com', 'Rajiv Mehra', '+1 (555) 782-9014', 'restaurant_owner', 'password123', 'rest-2', new Date().toISOString());

  // Seed Restaurants
  const insertRest = sqlite.prepare(`
    INSERT INTO restaurants (
      id, ownerId, name, slug, tagline, description, cuisineType, phone, email, address, city,
      postalCode, coverImageUrl, logoUrl, priceTier, seatingManagementMode, totalSeatingCapacity,
      slotDurationMinutes, bufferTimeMinutes, advanceBookingDays, minPartySize, maxPartySize,
      cancellationPolicy, cancellationCutoffHours, requiresManualApproval, status, rating, reviewCount, createdAt
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?
    )
  `);

  for (const r of INITIAL_RESTAURANTS) {
    insertRest.run(
      r.id, r.ownerId, r.name, r.slug, r.tagline, r.description, JSON.stringify(r.cuisineType),
      r.phone, r.email, r.address, r.city, r.postalCode, r.coverImageUrl, r.logoUrl || null,
      r.priceTier, r.seatingManagementMode, r.totalSeatingCapacity, r.slotDurationMinutes,
      r.bufferTimeMinutes, r.advanceBookingDays, r.minPartySize, r.maxPartySize,
      r.cancellationPolicy, r.cancellationCutoffHours, r.requiresManualApproval ? 1 : 0,
      r.status, r.rating || 4.9, r.reviewCount || 100, r.createdAt
    );
  }

  // Seed Tables
  const insertTable = sqlite.prepare(`
    INSERT INTO tables (id, restaurantId, tableNumber, capacity, locationArea, isActive)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const t of INITIAL_TABLES) {
    insertTable.run(t.id, t.restaurantId, t.tableNumber, t.capacity, t.locationArea, t.isActive ? 1 : 0);
  }

  // Seed Hours
  const insertHour = sqlite.prepare(`
    INSERT INTO restaurant_hours (id, restaurantId, dayOfWeek, openTime, closeTime, isClosed)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const h of INITIAL_HOURS) {
    insertHour.run(h.id, h.restaurantId, h.dayOfWeek, h.openTime, h.closeTime, h.isClosed ? 1 : 0);
  }

  // Seed Menu Categories
  const insertCategory = sqlite.prepare(`
    INSERT INTO menu_categories (id, restaurantId, name, displayOrder, description, isActive)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const c of INITIAL_MENU_CATEGORIES) {
    insertCategory.run(c.id, c.restaurantId, c.name, c.displayOrder, c.description || null, c.isActive ? 1 : 0);
  }

  // Seed Menu Items
  const insertMenuItem = sqlite.prepare(`
    INSERT INTO menu_items (
      id, restaurantId, categoryId, name, description, price, imageUrl, isAvailable, isVegetarian, isVegan, isGlutenFree, preparationNotes, displayOrder
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const m of INITIAL_MENU_ITEMS) {
    insertMenuItem.run(
      m.id, m.restaurantId, m.categoryId, m.name, m.description, m.price, m.imageUrl || null,
      m.isAvailable ? 1 : 0, m.isVegetarian ? 1 : 0, m.isVegan ? 1 : 0, m.isGlutenFree ? 1 : 0,
      m.preparationNotes || null, m.displayOrder
    );
  }

  // Seed Reservations
  const insertRes = sqlite.prepare(`
    INSERT INTO reservations (
      id, bookingReference, restaurantId, restaurantName, restaurantSlug, customerId,
      customerName, customerEmail, customerPhone, partySize, reservationDate, startTime,
      endTime, status, assignedTableId, assignedTableName, specialRequests, orderSubtotal,
      orderTax, estimatedTotal, items, createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);
  for (const res of INITIAL_RESERVATIONS) {
    insertRes.run(
      res.id, res.bookingReference, res.restaurantId, res.restaurantName || null, res.restaurantSlug || null,
      res.customerId, res.customerName, res.customerEmail, res.customerPhone, res.partySize,
      res.reservationDate, res.startTime, res.endTime, res.status, res.assignedTableId || null,
      res.assignedTableName || null, res.specialRequests || null, res.orderSubtotal, res.orderTax,
      res.estimatedTotal, JSON.stringify(res.items || []), res.createdAt, res.updatedAt
    );
  }
}

// Map helper functions
function mapRestaurant(row: any): Restaurant {
  return {
    ...row,
    cuisineType: JSON.parse(row.cuisineType),
    requiresManualApproval: Boolean(row.requiresManualApproval)
  };
}

function mapReservation(row: any): Reservation {
  return {
    ...row,
    items: JSON.parse(row.items || '[]')
  };
}

// Server Database Service
export const serverDb = {
  // RESTAURANTS
  getRestaurants: (): Restaurant[] => {
    const rows = sqlite.prepare('SELECT * FROM restaurants ORDER BY name ASC').all();
    return rows.map(mapRestaurant);
  },

  getRestaurantBySlug: (slug: string): Restaurant | null => {
    const row = sqlite.prepare('SELECT * FROM restaurants WHERE slug = ?').get(slug);
    return row ? mapRestaurant(row) : null;
  },

  getRestaurantById: (id: string): Restaurant | null => {
    const row = sqlite.prepare('SELECT * FROM restaurants WHERE id = ?').get(id);
    return row ? mapRestaurant(row) : null;
  },

  saveRestaurant: (r: Restaurant): Restaurant => {
    const existing = sqlite.prepare('SELECT id FROM restaurants WHERE id = ?').get(r.id);
    if (existing) {
      sqlite.prepare(`
        UPDATE restaurants SET 
          name = ?, tagline = ?, description = ?, cuisineType = ?, phone = ?, email = ?,
          address = ?, city = ?, coverImageUrl = ?, priceTier = ?, seatingManagementMode = ?,
          totalSeatingCapacity = ?, slotDurationMinutes = ?, bufferTimeMinutes = ?,
          minPartySize = ?, maxPartySize = ?, cancellationPolicy = ?, cancellationCutoffHours = ?,
          requiresManualApproval = ?, status = ?
        WHERE id = ?
      `).run(
        r.name, r.tagline, r.description, JSON.stringify(r.cuisineType), r.phone, r.email,
        r.address, r.city, r.coverImageUrl, r.priceTier, r.seatingManagementMode,
        r.totalSeatingCapacity, r.slotDurationMinutes, r.bufferTimeMinutes,
        r.minPartySize, r.maxPartySize, r.cancellationPolicy, r.cancellationCutoffHours,
        r.requiresManualApproval ? 1 : 0, r.status, r.id
      );
    } else {
      sqlite.prepare(`
        INSERT INTO restaurants (
          id, ownerId, name, slug, tagline, description, cuisineType, phone, email, address, city,
          coverImageUrl, priceTier, seatingManagementMode, totalSeatingCapacity, slotDurationMinutes,
          bufferTimeMinutes, minPartySize, maxPartySize, cancellationPolicy, cancellationCutoffHours,
          requiresManualApproval, status, createdAt
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `).run(
        r.id, r.ownerId, r.name, r.slug, r.tagline, r.description, JSON.stringify(r.cuisineType),
        r.phone, r.email, r.address, r.city, r.coverImageUrl, r.priceTier, r.seatingManagementMode,
        r.totalSeatingCapacity, r.slotDurationMinutes, r.bufferTimeMinutes, r.minPartySize,
        r.maxPartySize, r.cancellationPolicy, r.cancellationCutoffHours,
        r.requiresManualApproval ? 1 : 0, r.status, r.createdAt
      );
    }
    return r;
  },

  // TABLES
  getTables: (restaurantId: string): DiningTable[] => {
    const rows = sqlite.prepare('SELECT * FROM tables WHERE restaurantId = ? ORDER BY tableNumber ASC').all(restaurantId);
    return rows.map((r: any) => ({ ...r, isActive: Boolean(r.isActive) }));
  },

  saveTable: (t: DiningTable): DiningTable => {
    const existing = sqlite.prepare('SELECT id FROM tables WHERE id = ?').get(t.id);
    if (existing) {
      sqlite.prepare('UPDATE tables SET tableNumber = ?, capacity = ?, locationArea = ?, isActive = ? WHERE id = ?')
        .run(t.tableNumber, t.capacity, t.locationArea, t.isActive ? 1 : 0, t.id);
    } else {
      sqlite.prepare('INSERT INTO tables (id, restaurantId, tableNumber, capacity, locationArea, isActive) VALUES (?, ?, ?, ?, ?, ?)')
        .run(t.id, t.restaurantId, t.tableNumber, t.capacity, t.locationArea, t.isActive ? 1 : 0);
    }
    return t;
  },

  deleteTable: (id: string) => {
    sqlite.prepare('DELETE FROM tables WHERE id = ?').run(id);
  },

  // MENU
  getMenuCategories: (restaurantId: string): MenuCategory[] => {
    const rows = sqlite.prepare('SELECT * FROM menu_categories WHERE restaurantId = ? ORDER BY displayOrder ASC').all(restaurantId);
    return rows.map((r: any) => ({ ...r, isActive: Boolean(r.isActive) }));
  },

  saveMenuCategory: (c: MenuCategory): MenuCategory => {
    const existing = sqlite.prepare('SELECT id FROM menu_categories WHERE id = ?').get(c.id);
    if (existing) {
      sqlite.prepare('UPDATE menu_categories SET name = ?, displayOrder = ?, isActive = ? WHERE id = ?')
        .run(c.name, c.displayOrder, c.isActive ? 1 : 0, c.id);
    } else {
      sqlite.prepare('INSERT INTO menu_categories (id, restaurantId, name, displayOrder, isActive) VALUES (?, ?, ?, ?, ?)')
        .run(c.id, c.restaurantId, c.name, c.displayOrder, c.isActive ? 1 : 0);
    }
    return c;
  },

  deleteMenuCategory: (id: string) => {
    sqlite.prepare('DELETE FROM menu_categories WHERE id = ?').run(id);
  },

  getMenuItems: (restaurantId: string): MenuItem[] => {
    const rows = sqlite.prepare('SELECT * FROM menu_items WHERE restaurantId = ? ORDER BY displayOrder ASC').all(restaurantId);
    return rows.map((r: any) => ({
      ...r,
      isAvailable: Boolean(r.isAvailable),
      isVegetarian: Boolean(r.isVegetarian),
      isVegan: Boolean(r.isVegan),
      isGlutenFree: Boolean(r.isGlutenFree)
    }));
  },

  saveMenuItem: (m: MenuItem): MenuItem => {
    const existing = sqlite.prepare('SELECT id FROM menu_items WHERE id = ?').get(m.id);
    if (existing) {
      sqlite.prepare(`
        UPDATE menu_items SET 
          categoryId = ?, name = ?, description = ?, price = ?, imageUrl = ?,
          isAvailable = ?, isVegetarian = ?, isGlutenFree = ?, preparationNotes = ?
        WHERE id = ?
      `).run(
        m.categoryId, m.name, m.description, m.price, m.imageUrl || null,
        m.isAvailable ? 1 : 0, m.isVegetarian ? 1 : 0, m.isGlutenFree ? 1 : 0,
        m.preparationNotes || null, m.id
      );
    } else {
      sqlite.prepare(`
        INSERT INTO menu_items (
          id, restaurantId, categoryId, name, description, price, imageUrl, isAvailable, isVegetarian, isGlutenFree, preparationNotes, displayOrder
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        m.id, m.restaurantId, m.categoryId, m.name, m.description, m.price, m.imageUrl || null,
        m.isAvailable ? 1 : 0, m.isVegetarian ? 1 : 0, m.isGlutenFree ? 1 : 0,
        m.preparationNotes || null, m.displayOrder
      );
    }
    return m;
  },

  deleteMenuItem: (id: string) => {
    sqlite.prepare('DELETE FROM menu_items WHERE id = ?').run(id);
  },

  // HOURS
  getRestaurantHours: (restaurantId: string): RestaurantHours[] => {
    const rows = sqlite.prepare('SELECT * FROM restaurant_hours WHERE restaurantId = ?').all(restaurantId);
    return rows.map((r: any) => ({ ...r, isClosed: Boolean(r.isClosed) }));
  },

  saveRestaurantHours: (restaurantId: string, hours: RestaurantHours[]) => {
    sqlite.prepare('DELETE FROM restaurant_hours WHERE restaurantId = ?').run(restaurantId);
    const insert = sqlite.prepare('INSERT INTO restaurant_hours (id, restaurantId, dayOfWeek, openTime, closeTime, isClosed) VALUES (?, ?, ?, ?, ?, ?)');
    for (const h of hours) {
      insert.run(h.id, restaurantId, h.dayOfWeek, h.openTime, h.closeTime, h.isClosed ? 1 : 0);
    }
  },

  // RESERVATIONS & REAL DATABASE SLOT CAPACITY ENGINE
  getReservations: (filter?: { restaurantId?: string; customerId?: string }): Reservation[] => {
    let sql = 'SELECT * FROM reservations WHERE 1=1';
    const params: any[] = [];
    if (filter?.restaurantId) {
      sql += ' AND restaurantId = ?';
      params.push(filter.restaurantId);
    }
    if (filter?.customerId) {
      sql += ' AND customerId = ?';
      params.push(filter.customerId);
    }
    sql += ' ORDER BY reservationDate DESC, startTime DESC';
    const rows = sqlite.prepare(sql).all(...params);
    return rows.map(mapReservation);
  },

  getReservationById: (id: string): Reservation | null => {
    const row = sqlite.prepare('SELECT * FROM reservations WHERE id = ? OR bookingReference = ?').get(id, id);
    return row ? mapReservation(row) : null;
  },

  // Check if customer already has an active/upcoming reservation at this restaurant
  getActiveBookingForCustomer: (restaurantId: string, customerId: string, date: string): Reservation | null => {
    const row = sqlite.prepare(`
      SELECT * FROM reservations 
      WHERE restaurantId = ? 
        AND customerId = ? 
        AND reservationDate >= ? 
        AND status IN ('confirmed', 'pending', 'checked_in')
      ORDER BY reservationDate ASC, startTime ASC
      LIMIT 1
    `).get(restaurantId, customerId, date);
    return row ? mapReservation(row) : null;
  },

  checkSlotAvailability: (restaurantId: string, date: string, partySize: number): TimeSlotAvailability[] => {
    const rest = serverDb.getRestaurantById(restaurantId);
    if (!rest) return [];

    const dayOfWeek = new Date(date + 'T00:00:00').getDay();
    const hours = serverDb.getRestaurantHours(restaurantId);
    const dayHours = hours.find(h => h.dayOfWeek === dayOfWeek);

    if (!dayHours || dayHours.isClosed) {
      return [];
    }

    const openMinutes = timeToMinutes(dayHours.openTime);
    const closeMinutes = timeToMinutes(dayHours.closeTime);
    const slotDuration = rest.slotDurationMinutes || 90;

    const slotTimes: string[] = [];
    for (let m = openMinutes; m + slotDuration <= closeMinutes; m += 30) {
      slotTimes.push(minutesToTime(m));
    }

    const tables = serverDb.getTables(restaurantId).filter(t => t.isActive);
    const totalCapacity = rest.totalSeatingCapacity;

    // Fetch active reservations from the shared database
    const dateReservations = serverDb.getReservations({ restaurantId }).filter(
      r => r.reservationDate === date && r.status !== 'cancelled' && r.status !== 'no_show'
    );

    const results: TimeSlotAvailability[] = [];

    for (const time of slotTimes) {
      const slotStart = timeToMinutes(time);
      const slotEnd = slotStart + slotDuration;

      const overlapping = dateReservations.filter(res => {
        const resStart = timeToMinutes(res.startTime);
        const resEnd = timeToMinutes(res.endTime);
        return slotStart < resEnd && slotEnd > resStart;
      });

      const currentlyBookedGuests = overlapping.reduce((sum, r) => sum + r.partySize, 0);
      const remainingTotalSeats = Math.max(0, totalCapacity - currentlyBookedGuests);

      let isAvailable = true;
      let reason: string | undefined;
      let suggestedTableId: string | undefined;

      if (partySize > remainingTotalSeats) {
        isAvailable = false;
        reason = `Insufficient seating capacity. Only ${remainingTotalSeats} seats remain for this slot.`;
      } else if (partySize < rest.minPartySize) {
        isAvailable = false;
        reason = `Party size below restaurant minimum of ${rest.minPartySize}.`;
      } else if (partySize > rest.maxPartySize) {
        isAvailable = false;
        reason = `Party size exceeds restaurant maximum of ${rest.maxPartySize}.`;
      } else if (rest.seatingManagementMode === 'individual_tables') {
        const occupiedTableIds = new Set(overlapping.map(b => b.assignedTableId).filter(Boolean));
        const candidateTables = tables
          .filter(t => !occupiedTableIds.has(t.id) && t.capacity >= partySize)
          .sort((a, b) => a.capacity - b.capacity);

        if (candidateTables.length === 0) {
          isAvailable = false;
          reason = `No single available table found with at least ${partySize} seats for this slot.`;
        } else {
          suggestedTableId = candidateTables[0].id;
        }
      }

      results.push({
        time,
        formattedTime: formatTime12h(time),
        isAvailable,
        reason,
        remainingSeats: remainingTotalSeats,
        maxPartyAllowed: Math.min(remainingTotalSeats, rest.maxPartySize),
        suggestedTableId
      });
    }

    return results;
  },

  createReservation: (data: {
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
  }): { success: boolean; reservation?: Reservation; error?: string } => {
    const restaurant = serverDb.getRestaurantById(data.restaurantId);
    if (!restaurant) {
      return { success: false, error: 'Restaurant not found.' };
    }

    // Capacity verification against real disk database
    const slots = serverDb.checkSlotAvailability(data.restaurantId, data.reservationDate, data.partySize);
    const targetSlot = slots.find(s => s.time === data.startTime);

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

    // Recalculate menu items server-side
    const menuItems = serverDb.getMenuItems(data.restaurantId);
    const preOrderItems: Reservation['items'] = [];
    let subtotal = 0;

    if (data.items && data.items.length > 0) {
      for (const reqItem of data.items) {
        const found = menuItems.find(m => m.id === reqItem.menuItemId);
        if (!found) continue;
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

    let assignedTableId = targetSlot.suggestedTableId;
    let assignedTableName: string | undefined;

    if (assignedTableId) {
      const tables = serverDb.getTables(data.restaurantId);
      const tab = tables.find(t => t.id === assignedTableId);
      if (tab) {
        assignedTableName = `${tab.tableNumber} (Cap: ${tab.capacity})`;
      }
    }

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
      specialRequests: data.specialRequests,
      orderSubtotal: subtotal,
      orderTax: tax,
      estimatedTotal,
      items: preOrderItems,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    sqlite.prepare(`
      INSERT INTO reservations (
        id, bookingReference, restaurantId, restaurantName, restaurantSlug, customerId,
        customerName, customerEmail, customerPhone, partySize, reservationDate, startTime,
        endTime, status, assignedTableId, assignedTableName, specialRequests, orderSubtotal,
        orderTax, estimatedTotal, items, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newReservation.id, newReservation.bookingReference, newReservation.restaurantId,
      newReservation.restaurantName || null, newReservation.restaurantSlug || null,
      newReservation.customerId, newReservation.customerName, newReservation.customerEmail,
      newReservation.customerPhone, newReservation.partySize, newReservation.reservationDate,
      newReservation.startTime, newReservation.endTime, newReservation.status,
      newReservation.assignedTableId || null, newReservation.assignedTableName || null,
      newReservation.specialRequests || null, newReservation.orderSubtotal, newReservation.orderTax,
      newReservation.estimatedTotal, JSON.stringify(newReservation.items),
      newReservation.createdAt, newReservation.updatedAt
    );

    return { success: true, reservation: newReservation };
  },

  updateReservationStatus: (id: string, status: ReservationStatus, cancellationReason?: string): Reservation | null => {
    const existing = serverDb.getReservationById(id);
    if (!existing) return null;

    const cancelledAt = status === 'cancelled' ? new Date().toISOString() : existing.cancelledAt;
    const reason = status === 'cancelled' ? (cancellationReason || 'Cancelled by guest or host') : existing.cancellationReason;

    sqlite.prepare(`
      UPDATE reservations 
      SET status = ?, cancellationReason = ?, cancelledAt = ?, updatedAt = ?
      WHERE id = ?
    `).run(status, reason || null, cancelledAt || null, new Date().toISOString(), id);

    return serverDb.getReservationById(id);
  },

  assignReservationTable: (reservationId: string, tableId: string): Reservation | null => {
    const existing = serverDb.getReservationById(reservationId);
    if (!existing) return null;

    const tables = serverDb.getTables(existing.restaurantId);
    const table = tables.find(t => t.id === tableId);
    const tableName = table ? `${table.tableNumber} (Cap: ${table.capacity})` : null;

    sqlite.prepare(`
      UPDATE reservations SET assignedTableId = ?, assignedTableName = ?, updatedAt = ? WHERE id = ?
    `).run(tableId, tableName, new Date().toISOString(), reservationId);

    return serverDb.getReservationById(reservationId);
  },

  // USERS
  getUsers: (): UserProfile[] => {
    return sqlite.prepare('SELECT * FROM users').all() as UserProfile[];
  },

  getUserById: (id: string): UserProfile | null => {
    return sqlite.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserProfile | null;
  },

  getUserByEmail: (email: string): UserProfile | null => {
    return sqlite.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email) as UserProfile | null;
  },

  saveUser: (u: UserProfile): UserProfile => {
    const existing = sqlite.prepare('SELECT id FROM users WHERE id = ?').get(u.id);
    if (existing) {
      sqlite.prepare(`
        UPDATE users SET email = ?, fullName = ?, phone = ?, role = ?, password = ?, ownedRestaurantId = ?
        WHERE id = ?
      `).run(u.email, u.fullName, u.phone || null, u.role, u.password || null, u.ownedRestaurantId || null, u.id);
    } else {
      sqlite.prepare(`
        INSERT INTO users (id, email, fullName, phone, role, password, ownedRestaurantId, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(u.id, u.email, u.fullName, u.phone || null, u.role, u.password || null, u.ownedRestaurantId || null, u.createdAt);
    }
    return u;
  }
};

// Helpers
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

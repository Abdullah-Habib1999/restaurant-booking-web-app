// Safe dynamic loader for better-sqlite3 to prevent serverless function crashes when native addons are missing
let DatabaseConstructor: any = null;
try {
  DatabaseConstructor = eval('require')('better-sqlite3');
} catch (e) {
  console.warn('[serverDb] better-sqlite3 native addon not available, running resilient in-memory engine.');
}

import path from 'path';
import fs from 'fs';
import os from 'os';
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

// Memory map for cinema-style temporary seat holds with automatic expiration
const seatHolds = new Map<string, { token: string; expiresAt: number }>();

// Safe SQLite initialization that works reliably across local Windows, Linux, and Vercel/Netlify/AWS Lambda serverless environments
function initSqliteDatabase(): any {
  if (!DatabaseConstructor) return null;

  const isServerless = Boolean(
    process.env.NETLIFY ||
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT ||
    process.env.NODE_ENV === 'production'
  );
  const candidateDirs: string[] = [];

  if (isServerless) {
    candidateDirs.push(
      path.join(os.tmpdir(), 'tablereserve-data'),
      path.join('/tmp', 'tablereserve-data')
    );
  } else {
    candidateDirs.push(
      path.join(process.cwd(), 'data'),
      path.join(os.tmpdir(), 'tablereserve-data')
    );
  }

  for (const dir of candidateDirs) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const dbPath = path.join(dir, 'tablereserve.db');
      const db = new DatabaseConstructor(dbPath);
      try {
        db.pragma('journal_mode = WAL');
      } catch (walErr) {
        // WAL mode not supported on some virtual filesystems, continue with default journal
      }
      return db;
    } catch (err) {
      console.warn(`[serverDb] Could not initialize SQLite in ${dir}:`, err);
    }
  }

  try {
    console.warn('[serverDb] Using in-memory SQLite database as resilient fallback.');
    return new DatabaseConstructor(':memory:');
  } catch (err) {
    console.warn('[serverDb] Could not create in-memory SQLite database:', err);
    return null;
  }
}

const sqlite = initSqliteDatabase();

if (sqlite) {
  try {
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

  CREATE TABLE IF NOT EXISTS restaurant_closures (
    id TEXT PRIMARY KEY,
    restaurantId TEXT NOT NULL,
    closureDate TEXT NOT NULL,
    reason TEXT
  );

  CREATE TABLE IF NOT EXISTS tables (
    id TEXT PRIMARY KEY,
    restaurantId TEXT NOT NULL,
    tableNumber TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    locationArea TEXT,
    isActive INTEGER NOT NULL DEFAULT 1,
    shape TEXT DEFAULT 'rectangle',
    posX REAL DEFAULT 50,
    posY REAL DEFAULT 50,
    rotation REAL DEFAULT 0
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
    isNonVegetarian INTEGER NOT NULL DEFAULT 0,
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
    assignedSeatNumbers TEXT, -- JSON array of numbers e.g. [1, 2]
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

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    restaurantId TEXT NOT NULL,
    customerId TEXT NOT NULL,
    customerName TEXT NOT NULL,
    customerEmail TEXT,
    reservationId TEXT UNIQUE NOT NULL,
    overallRating INTEGER NOT NULL CHECK (overallRating >= 1 AND overallRating <= 5),
    foodRating INTEGER CHECK (foodRating >= 1 AND foodRating <= 5),
    serviceRating INTEGER CHECK (serviceRating >= 1 AND serviceRating <= 5),
    ambienceRating INTEGER CHECK (ambienceRating >= 1 AND ambienceRating <= 5),
    valueRating INTEGER CHECK (valueRating >= 1 AND valueRating <= 5),
    comment TEXT,
    tags TEXT, -- JSON array of strings
    ownerResponse TEXT,
    ownerRespondedAt TEXT,
    isReported INTEGER NOT NULL DEFAULT 0,
    reportReason TEXT,
    reportedAt TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (restaurantId) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (reservationId) REFERENCES reservations(id) ON DELETE CASCADE,
    FOREIGN KEY (customerId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_reviews_restaurant ON reviews(restaurantId);
  CREATE INDEX IF NOT EXISTS idx_reviews_customer ON reviews(customerId);
  CREATE INDEX IF NOT EXISTS idx_reviews_reservation ON reviews(reservationId);
`);

// Safe migrations for table layout, seat numbers, and reviews
try {
  sqlite.exec('ALTER TABLE menu_items ADD COLUMN isNonVegetarian INTEGER NOT NULL DEFAULT 0');
} catch (e) {}

try {
  sqlite.exec("ALTER TABLE tables ADD COLUMN shape TEXT DEFAULT 'rectangle'");
} catch (e) {}
try {
  sqlite.exec("ALTER TABLE tables ADD COLUMN posX REAL DEFAULT 50");
} catch (e) {}
try {
  sqlite.exec("ALTER TABLE tables ADD COLUMN posY REAL DEFAULT 50");
} catch (e) {}
try {
  sqlite.exec("ALTER TABLE tables ADD COLUMN rotation REAL DEFAULT 0");
} catch (e) {}
try {
  sqlite.exec("ALTER TABLE reservations ADD COLUMN assignedSeatNumbers TEXT");
} catch (e) {}

// Seed Initial Data if database is freshly created
const userCount = (sqlite.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
if (userCount === 0) {
  // Seed Users
  const insertUser = sqlite.prepare(`
    INSERT INTO users (id, email, fullName, phone, role, password, ownedRestaurantId, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertUser.run('cust-1', 'customer@demo.com', 'Eleanor Vance', '+1 (555) 234-9988', 'customer', 'password123', null, new Date().toISOString());
  insertUser.run('cust-2', 'marcus.w@example.com', 'Marcus Wright', '+1 (555) 777-4321', 'customer', 'password123', null, new Date().toISOString());
  insertUser.run('cust-3', 'sophia.l@example.com', 'Sophia Lorenzi', '+1 (555) 665-8833', 'customer', 'password123', null, new Date().toISOString());
  insertUser.run('cust-4', 'david.patel@example.com', 'David K. Patel', '+1 (555) 332-9911', 'customer', 'password123', null, new Date().toISOString());
  insertUser.run('cust-5', 'kenji.t@example.com', 'Kenji Takahashi', '+1 (555) 441-2090', 'customer', 'password123', null, new Date().toISOString());
  insertUser.run('cust-6', 'chloe.b@example.com', 'Chloe Bennett', '+1 (555) 998-1122', 'customer', 'password123', null, new Date().toISOString());
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

  // Seed Completed Reservations for real review capability
  insertRes.run(
    'res-comp-1', 'LT-COMP-01', 'rest-1', 'L’Osteria Terracotta', 'losteria-terracotta',
    'cust-1', 'Eleanor Vance', 'customer@demo.com', '+1 (555) 234-9988', 2,
    '2026-10-18', '19:30', '21:00', 'completed', 'tab-101', 'T-01 (Cap: 2)',
    'Anniversary dinner', 84.50, 7.50, 92.00, '[]',
    new Date(Date.now() - 3600000 * 96).toISOString(),
    new Date(Date.now() - 3600000 * 96).toISOString()
  );

  insertRes.run(
    'res-comp-2', 'LT-COMP-02', 'rest-1', 'L’Osteria Terracotta', 'losteria-terracotta',
    'cust-2', 'Marcus Wright', 'marcus.w@example.com', '+1 (555) 777-4321', 4,
    '2026-10-19', '20:00', '21:30', 'completed', 'tab-103', 'T-03 (Cap: 4)',
    'Business gathering', 142.00, 12.60, 154.60, '[]',
    new Date(Date.now() - 3600000 * 72).toISOString(),
    new Date(Date.now() - 3600000 * 72).toISOString()
  );

  insertRes.run(
    'res-comp-3', 'SS-COMP-01', 'rest-2', 'Saffron & Silk Bistro', 'saffron-and-silk-bistro',
    'cust-1', 'Eleanor Vance', 'customer@demo.com', '+1 (555) 234-9988', 2,
    '2026-10-17', '19:00', '20:30', 'completed', 'tab-201', 'S-01 (Cap: 2)',
    'Window view requested', 72.00, 6.40, 78.40, '[]',
    new Date(Date.now() - 3600000 * 120).toISOString(),
    new Date(Date.now() - 3600000 * 120).toISOString()
  );

  insertRes.run(
    'res-comp-4', 'LT-COMP-03', 'rest-1', 'L’Osteria Terracotta', 'losteria-terracotta',
    'cust-1', 'Eleanor Vance', 'customer@demo.com', '+1 (555) 234-9988', 3,
    '2026-10-21', '18:30', '20:00', 'completed', 'tab-102', 'T-02 (Cap: 4)',
    'Family dinner', 115.00, 10.20, 125.20, '[]',
    new Date(Date.now() - 3600000 * 24).toISOString(),
    new Date(Date.now() - 3600000 * 24).toISOString()
  );

}

// Seed completed reservations & verified initial reviews if not yet present
try {
  // Ensure all reviewer customer accounts exist in users table so foreign keys succeed
  const insertUser = sqlite.prepare(`
    INSERT OR IGNORE INTO users (id, email, fullName, phone, role, password, ownedRestaurantId, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const seedCustomers = [
    { id: 'cust-1', email: 'customer@demo.com', fullName: 'Eleanor Vance', phone: '+1 (555) 234-9988' },
    { id: 'cust-2', email: 'marcus.w@example.com', fullName: 'Marcus Wright', phone: '+1 (555) 777-4321' },
    { id: 'cust-3', email: 'sophia.l@example.com', fullName: 'Sophia Lorenzi', phone: '+1 (555) 665-8833' },
    { id: 'cust-4', email: 'david.patel@example.com', fullName: 'David K. Patel', phone: '+1 (555) 332-9911' },
    { id: 'cust-5', email: 'kenji.t@example.com', fullName: 'Kenji Takahashi', phone: '+1 (555) 441-2090' },
    { id: 'cust-6', email: 'chloe.b@example.com', fullName: 'Chloe Bennett', phone: '+1 (555) 998-1122' }
  ];
  for (const c of seedCustomers) {
    try {
      insertUser.run(c.id, c.email, c.fullName, c.phone, 'customer', 'password123', null, new Date().toISOString());
    } catch (e) {}
  }

  const insertRes = sqlite.prepare(`
    INSERT OR IGNORE INTO reservations (
      id, bookingReference, restaurantId, restaurantName, restaurantSlug, customerId,
      customerName, customerEmail, customerPhone, partySize, reservationDate, startTime,
      endTime, status, assignedTableId, assignedTableName, specialRequests, orderSubtotal,
      orderTax, estimatedTotal, items, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const completedResList = [
    ['res-comp-1', 'LT-COMP-01', 'rest-1', 'L’Osteria Terracotta', 'losteria-terracotta', 'cust-1', 'Eleanor Vance', 'customer@demo.com', '+1 (555) 234-9988', 2, '2026-10-18', '19:30', '21:00', 'completed', 'tab-101', 'T-01 (Cap: 2)', 'Anniversary dinner', 84.50, 7.50, 92.00, '[]', new Date(Date.now() - 3600000 * 96).toISOString(), new Date(Date.now() - 3600000 * 96).toISOString()],
    ['res-comp-2', 'LT-COMP-02', 'rest-1', 'L’Osteria Terracotta', 'losteria-terracotta', 'cust-2', 'Marcus Wright', 'marcus.w@example.com', '+1 (555) 777-4321', 4, '2026-10-19', '20:00', '21:30', 'completed', 'tab-103', 'T-03 (Cap: 4)', 'Business gathering', 142.00, 12.60, 154.60, '[]', new Date(Date.now() - 3600000 * 72).toISOString(), new Date(Date.now() - 3600000 * 72).toISOString()],
    ['res-comp-3', 'SS-COMP-01', 'rest-2', 'Saffron & Silk Bistro', 'saffron-and-silk-bistro', 'cust-1', 'Eleanor Vance', 'customer@demo.com', '+1 (555) 234-9988', 2, '2026-10-17', '19:00', '20:30', 'completed', 'tab-201', 'S-01 (Cap: 2)', 'Window view requested', 72.00, 6.40, 78.40, '[]', new Date(Date.now() - 3600000 * 120).toISOString(), new Date(Date.now() - 3600000 * 120).toISOString()],
    ['res-comp-4', 'LT-COMP-03', 'rest-1', 'L’Osteria Terracotta', 'losteria-terracotta', 'cust-1', 'Eleanor Vance', 'customer@demo.com', '+1 (555) 234-9988', 3, '2026-10-21', '18:30', '20:00', 'completed', 'tab-102', 'T-02 (Cap: 4)', 'Family dinner', 115.00, 10.20, 125.20, '[]', new Date(Date.now() - 3600000 * 24).toISOString(), new Date(Date.now() - 3600000 * 24).toISOString()],
    ['res-comp-5', 'SS-COMP-02', 'rest-2', 'Saffron & Silk Bistro', 'saffron-and-silk-bistro', 'cust-4', 'David K. Patel', 'david.patel@example.com', '+1 (555) 332-9911', 4, '2026-10-14', '19:30', '21:00', 'completed', 'tab-203', 'S-03 (Cap: 4)', 'Dinner meeting', 98.00, 8.70, 106.70, '[]', new Date(Date.now() - 3600000 * 140).toISOString(), new Date(Date.now() - 3600000 * 140).toISOString()],
    ['res-comp-6', 'KR-COMP-01', 'rest-3', 'Kanso Robata & Botanical Bar', 'kanso-robata-bar', 'cust-5', 'Kenji Takahashi', 'kenji.t@example.com', '+1 (555) 441-2090', 2, '2026-10-20', '20:00', '21:30', 'completed', null, 'Chef Counter', 'Robata counter seating', 160.00, 14.20, 174.20, '[]', new Date(Date.now() - 3600000 * 30).toISOString(), new Date(Date.now() - 3600000 * 30).toISOString()],
    ['res-comp-7', 'KR-COMP-02', 'rest-3', 'Kanso Robata & Botanical Bar', 'kanso-robata-bar', 'cust-6', 'Chloe Bennett', 'chloe.b@example.com', '+1 (555) 998-1122', 2, '2026-10-19', '19:00', '20:45', 'completed', null, 'Garden Hearth', 'Birthday celebration', 185.00, 16.40, 201.40, '[]', new Date(Date.now() - 3600000 * 50).toISOString(), new Date(Date.now() - 3600000 * 50).toISOString()]
  ];

  for (const row of completedResList) {
    try {
      insertRes.run(...row);
    } catch (e) {}
  }

  const insertRev = sqlite.prepare(`
    INSERT OR IGNORE INTO reviews (
      id, restaurantId, customerId, customerName, customerEmail, reservationId,
      overallRating, foodRating, serviceRating, ambienceRating, valueRating,
      comment, tags, ownerResponse, ownerRespondedAt, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const rev of INITIAL_REVIEWS) {
    try {
      insertRev.run(
        rev.id,
        rev.restaurantId,
        rev.customerId,
        rev.customerName,
        rev.customerEmail || null,
        rev.reservationId,
        rev.overallRating,
        rev.foodRating || null,
        rev.serviceRating || null,
        rev.ambienceRating || null,
        rev.valueRating || null,
        rev.comment || null,
        rev.tags ? JSON.stringify(rev.tags) : null,
        rev.ownerResponse || null,
        rev.ownerRespondedAt || null,
        rev.createdAt,
        rev.updatedAt
      );
      } catch (e) {}
    }
  } catch (e) {}

  // Ensure all restaurant ratings accurately reflect real database review averages
  // (Synchronizes restaurants where reviewCount or rating might differ from actual reviews)
  try {
    const allRests = sqlite.prepare('SELECT id FROM restaurants').all() as { id: string }[];
    for (const r of allRests) {
      const revStats = sqlite.prepare(`
        SELECT COUNT(*) as count, AVG(overallRating) as avgRating 
        FROM reviews WHERE restaurantId = ?
      `).get(r.id) as { count: number; avgRating: number | null };
      const realCount = revStats?.count || 0;
      if (realCount > 0) {
        const realRating = Number((revStats.avgRating || 0).toFixed(1));
        sqlite.prepare('UPDATE restaurants SET rating = ?, reviewCount = ? WHERE id = ?').run(realRating, realCount, r.id);
      }
    }
  } catch (err) {
    console.warn('[serverDb] SQLite schema execution error:', err);
  }
} catch (outerErr) {
  console.warn('[serverDb] SQLite initialization error:', outerErr);
}
}

// In-memory mirrored persistent collections for guaranteed zero-downtime serverless resilience
const memRestaurants: Restaurant[] = [...INITIAL_RESTAURANTS];
const memTables: DiningTable[] = [...INITIAL_TABLES];
const memHours: RestaurantHours[] = [...INITIAL_HOURS];
const memClosures: RestaurantClosure[] = [];
const memCategories: MenuCategory[] = [...INITIAL_MENU_CATEGORIES];
const memMenuItems: MenuItem[] = [...INITIAL_MENU_ITEMS];
const memReservations: Reservation[] = [...INITIAL_RESERVATIONS];
const memReviews: Review[] = [...INITIAL_REVIEWS];
const memUsers: UserProfile[] = [
  { id: 'cust-1', email: 'customer@demo.com', fullName: 'Eleanor Vance', phone: '+1 (555) 234-9988', role: 'customer', createdAt: new Date().toISOString() },
  { id: 'owner-1', email: 'owner@losteria.com', fullName: 'Chef Marco Bellini', phone: '+1 (555) 349-8201', role: 'restaurant_owner', ownedRestaurantId: 'rest-1', createdAt: new Date().toISOString() },
  { id: 'owner-2', email: 'owner@saffron.com', fullName: 'Rajiv Mehra', phone: '+1 (555) 782-9014', role: 'restaurant_owner', ownedRestaurantId: 'rest-2', createdAt: new Date().toISOString() }
];

function safeQuery<T>(sqlFn: () => T, memoryFallbackFn: () => T): T {
  if (sqlite) {
    try {
      return sqlFn();
    } catch (err) {
      console.warn('[serverDb] SQLite query error, using memory fallback:', err);
    }
  }
  return memoryFallbackFn();
}

function safeMutation<T>(sqlFn: () => T, memoryMutationFn: () => T): T {
  const result = memoryMutationFn();
  if (sqlite) {
    try {
      sqlFn();
    } catch (err) {
      console.warn('[serverDb] SQLite mutation error, memory store was updated:', err);
    }
  }
  return result;
}

// Map helper functions
function mapRestaurant(row: any): Restaurant {
  return {
    ...row,
    cuisineType: JSON.parse(row.cuisineType || '[]'),
    requiresManualApproval: Boolean(row.requiresManualApproval),
    timezone: row.timezone || 'America/New_York'
  };
}

function mapReservation(row: any): Reservation {
  return {
    ...row,
    items: JSON.parse(row.items || '[]'),
    assignedSeatNumbers: row.assignedSeatNumbers ? JSON.parse(row.assignedSeatNumbers) : undefined
  };
}

function mapReview(row: any): Review {
  return {
    ...row,
    overallRating: Number(row.overallRating),
    foodRating: row.foodRating !== null && row.foodRating !== undefined ? Number(row.foodRating) : undefined,
    serviceRating: row.serviceRating !== null && row.serviceRating !== undefined ? Number(row.serviceRating) : undefined,
    ambienceRating: row.ambienceRating !== null && row.ambienceRating !== undefined ? Number(row.ambienceRating) : undefined,
    valueRating: row.valueRating !== null && row.valueRating !== undefined ? Number(row.valueRating) : undefined,
    tags: row.tags ? JSON.parse(row.tags) : [],
    isReported: Boolean(row.isReported)
  };
}

// Server Database Service
export const serverDb = {
  // RESTAURANTS
  getRestaurants: (): Restaurant[] => {
    return safeQuery(
      () => sqlite.prepare('SELECT * FROM restaurants ORDER BY name ASC').all().map(mapRestaurant),
      () => memRestaurants
    );
  },

  getRestaurantBySlug: (slug: string): Restaurant | null => {
    return safeQuery(
      () => {
        let row = sqlite.prepare('SELECT * FROM restaurants WHERE slug = ?').get(slug);
        if (!row) {
          row = sqlite.prepare('SELECT * FROM restaurants WHERE id = ?').get(slug);
        }
        return row ? mapRestaurant(row) : null;
      },
      () => memRestaurants.find(r => r.slug === slug || r.id === slug) || null
    );
  },

  getRestaurantById: (id: string): Restaurant | null => {
    return safeQuery(
      () => {
        let row = sqlite.prepare('SELECT * FROM restaurants WHERE id = ?').get(id);
        if (!row) {
          row = sqlite.prepare('SELECT * FROM restaurants WHERE slug = ?').get(id);
        }
        return row ? mapRestaurant(row) : null;
      },
      () => memRestaurants.find(r => r.id === id || r.slug === id) || null
    );
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
    return safeQuery(
      () => {
        const rows = sqlite.prepare('SELECT * FROM tables WHERE restaurantId = ? ORDER BY tableNumber ASC').all(restaurantId);
        return rows.map((r: any) => ({
          ...r,
          isActive: Boolean(r.isActive),
          shape: r.shape || 'rectangle',
          posX: r.posX !== null && r.posX !== undefined ? Number(r.posX) : 50,
          posY: r.posY !== null && r.posY !== undefined ? Number(r.posY) : 50,
          rotation: r.rotation !== null && r.rotation !== undefined ? Number(r.rotation) : 0,
        }));
      },
      () => memTables.filter(t => t.restaurantId === restaurantId)
    );
  },

  saveTable: (t: DiningTable): DiningTable => {
    return safeMutation(
      () => {
        const existing = sqlite.prepare('SELECT id FROM tables WHERE id = ?').get(t.id);
        const shape = t.shape || 'rectangle';
        const posX = t.posX !== undefined ? t.posX : 50;
        const posY = t.posY !== undefined ? t.posY : 50;
        const rotation = t.rotation !== undefined ? t.rotation : 0;

        if (existing) {
          sqlite.prepare(`
            UPDATE tables SET 
              tableNumber = ?, capacity = ?, locationArea = ?, isActive = ?,
              shape = ?, posX = ?, posY = ?, rotation = ?
            WHERE id = ?
          `).run(t.tableNumber, t.capacity, t.locationArea, t.isActive ? 1 : 0, shape, posX, posY, rotation, t.id);
        } else {
          sqlite.prepare(`
            INSERT INTO tables (id, restaurantId, tableNumber, capacity, locationArea, isActive, shape, posX, posY, rotation) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(t.id, t.restaurantId, t.tableNumber, t.capacity, t.locationArea, t.isActive ? 1 : 0, shape, posX, posY, rotation);
        }
        return t;
      },
      () => {
        const idx = memTables.findIndex(x => x.id === t.id);
        if (idx >= 0) memTables[idx] = t;
        else memTables.push(t);
        return t;
      }
    );
  },

  deleteTable: (id: string) => {
    safeMutation(
      () => { sqlite.prepare('DELETE FROM tables WHERE id = ?').run(id); },
      () => { const idx = memTables.findIndex(x => x.id === id); if (idx >= 0) memTables.splice(idx, 1); }
    );
  },

  // MENU
  getMenuCategories: (restaurantId: string): MenuCategory[] => {
    return safeQuery(
      () => {
        const rows = sqlite.prepare('SELECT * FROM menu_categories WHERE restaurantId = ? ORDER BY displayOrder ASC').all(restaurantId);
        return rows.map((r: any) => ({ ...r, isActive: Boolean(r.isActive) }));
      },
      () => memCategories.filter(c => c.restaurantId === restaurantId)
    );
  },

  saveMenuCategory: (c: MenuCategory): MenuCategory => {
    return safeMutation(
      () => {
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
      () => {
        const idx = memCategories.findIndex(x => x.id === c.id);
        if (idx >= 0) memCategories[idx] = c;
        else memCategories.push(c);
        return c;
      }
    );
  },

  deleteMenuCategory: (id: string) => {
    safeMutation(
      () => { sqlite.prepare('DELETE FROM menu_categories WHERE id = ?').run(id); },
      () => { const idx = memCategories.findIndex(x => x.id === id); if (idx >= 0) memCategories.splice(idx, 1); }
    );
  },

  getMenuItems: (restaurantId: string): MenuItem[] => {
    return safeQuery(
      () => {
        const rows = sqlite.prepare('SELECT * FROM menu_items WHERE restaurantId = ? ORDER BY displayOrder ASC').all(restaurantId);
        return rows.map((r: any) => ({
          ...r,
          isAvailable: Boolean(r.isAvailable),
          isVegetarian: Boolean(r.isVegetarian),
          isNonVegetarian: Boolean(r.isNonVegetarian),
          isVegan: Boolean(r.isVegan),
          isGlutenFree: Boolean(r.isGlutenFree)
        }));
      },
      () => memMenuItems.filter(m => m.restaurantId === restaurantId)
    );
  },

  saveMenuItem: (m: MenuItem): MenuItem => {
    return safeMutation(
      () => {
        const existing = sqlite.prepare('SELECT id FROM menu_items WHERE id = ?').get(m.id);
        if (existing) {
          sqlite.prepare(`
            UPDATE menu_items SET 
              categoryId = ?, name = ?, description = ?, price = ?, imageUrl = ?,
              isAvailable = ?, isVegetarian = ?, isNonVegetarian = ?, isGlutenFree = ?, preparationNotes = ?
            WHERE id = ?
          `).run(
            m.categoryId, m.name, m.description, m.price, m.imageUrl || null,
            m.isAvailable ? 1 : 0, m.isVegetarian ? 1 : 0, m.isNonVegetarian ? 1 : 0, m.isGlutenFree ? 1 : 0,
            m.preparationNotes || null, m.id
          );
        } else {
          sqlite.prepare(`
            INSERT INTO menu_items (
              id, restaurantId, categoryId, name, description, price, imageUrl, isAvailable, isVegetarian, isNonVegetarian, isGlutenFree, preparationNotes, displayOrder
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            m.id, m.restaurantId, m.categoryId, m.name, m.description, m.price, m.imageUrl || null,
            m.isAvailable ? 1 : 0, m.isVegetarian ? 1 : 0, m.isNonVegetarian ? 1 : 0, m.isGlutenFree ? 1 : 0,
            m.preparationNotes || null, m.displayOrder
          );
        }
        return m;
      },
      () => {
        const idx = memMenuItems.findIndex(x => x.id === m.id);
        if (idx >= 0) memMenuItems[idx] = m;
        else memMenuItems.push(m);
        return m;
      }
    );
  },

  deleteMenuItem: (id: string) => {
    safeMutation(
      () => { sqlite.prepare('DELETE FROM menu_items WHERE id = ?').run(id); },
      () => { const idx = memMenuItems.findIndex(x => x.id === id); if (idx >= 0) memMenuItems.splice(idx, 1); }
    );
  },

  // HOURS & SCHEDULE
  getRestaurantHours: (restaurantId: string): RestaurantHours[] => {
    const rest = serverDb.getRestaurantById(restaurantId);
    const targetId = rest ? rest.id : restaurantId;

    return safeQuery(
      () => {
        const rows = sqlite.prepare('SELECT * FROM restaurant_hours WHERE restaurantId = ? ORDER BY dayOfWeek ASC').all(targetId);
        if (!rows || rows.length === 0) {
          const defaults = INITIAL_HOURS.filter(h => h.restaurantId === targetId);
          if (defaults.length > 0) {
            try {
              const insert = sqlite.prepare('INSERT OR IGNORE INTO restaurant_hours (id, restaurantId, dayOfWeek, openTime, closeTime, isClosed) VALUES (?, ?, ?, ?, ?, ?)');
              for (const h of defaults) {
                insert.run(h.id, targetId, h.dayOfWeek, h.openTime, h.closeTime, h.isClosed ? 1 : 0);
              }
              return defaults;
            } catch (e) {
              return defaults;
            }
          }
          const standardHours: RestaurantHours[] = [0, 1, 2, 3, 4, 5, 6].map(day => ({
            id: `gen-hour-${targetId}-${day}`,
            restaurantId: targetId,
            dayOfWeek: day,
            openTime: '11:30',
            closeTime: '23:00',
            isClosed: false
          }));
          try {
            const insert = sqlite.prepare('INSERT OR IGNORE INTO restaurant_hours (id, restaurantId, dayOfWeek, openTime, closeTime, isClosed) VALUES (?, ?, ?, ?, ?, ?)');
            for (const h of standardHours) {
              insert.run(h.id, targetId, h.dayOfWeek, h.openTime, h.closeTime, 0);
            }
          } catch (e) {}
          return standardHours;
        }
        return rows.map((r: any) => ({ ...r, isClosed: Boolean(r.isClosed) }));
      },
      () => {
        const memList = memHours.filter(h => h.restaurantId === targetId);
        if (memList.length > 0) return memList;
        return [0, 1, 2, 3, 4, 5, 6].map(day => ({
          id: `gen-hour-${targetId}-${day}`,
          restaurantId: targetId,
          dayOfWeek: day,
          openTime: '11:30',
          closeTime: '23:00',
          isClosed: false
        }));
      }
    );
  },

  saveRestaurantHours: (restaurantId: string, hours: RestaurantHours[]) => {
    const rest = serverDb.getRestaurantById(restaurantId);
    const targetId = rest ? rest.id : restaurantId;
    safeMutation(
      () => {
        sqlite.prepare('DELETE FROM restaurant_hours WHERE restaurantId = ?').run(targetId);
        const insert = sqlite.prepare('INSERT INTO restaurant_hours (id, restaurantId, dayOfWeek, openTime, closeTime, isClosed) VALUES (?, ?, ?, ?, ?, ?)');
        for (const h of hours) {
          insert.run(h.id, targetId, h.dayOfWeek, h.openTime, h.closeTime, h.isClosed ? 1 : 0);
        }
      },
      () => {
        for (const h of hours) {
          const idx = memHours.findIndex(x => x.id === h.id || (x.restaurantId === targetId && x.dayOfWeek === h.dayOfWeek));
          if (idx >= 0) memHours[idx] = h;
          else memHours.push(h);
        }
      }
    );
  },

  // CLOSURES & SPECIAL HOLIDAYS
  getRestaurantClosures: (restaurantId: string): RestaurantClosure[] => {
    const rest = serverDb.getRestaurantById(restaurantId);
    const targetId = rest ? rest.id : restaurantId;
    return safeQuery(
      () => sqlite.prepare('SELECT * FROM restaurant_closures WHERE restaurantId = ?').all(targetId) || [],
      () => memClosures.filter(c => c.restaurantId === targetId)
    );
  },

  getRestaurantClosure: (restaurantId: string, date: string): RestaurantClosure | null => {
    const rest = serverDb.getRestaurantById(restaurantId);
    const targetId = rest ? rest.id : restaurantId;
    return safeQuery(
      () => sqlite.prepare('SELECT * FROM restaurant_closures WHERE restaurantId = ? AND closureDate = ?').get(targetId, date) || null,
      () => memClosures.find(c => c.restaurantId === targetId && c.closureDate === date) || null
    );
  },

  saveRestaurantClosure: (closure: RestaurantClosure): RestaurantClosure => {
    return safeMutation(
      () => {
        sqlite.prepare('INSERT OR REPLACE INTO restaurant_closures (id, restaurantId, closureDate, reason) VALUES (?, ?, ?, ?)').run(
          closure.id, closure.restaurantId, closure.closureDate, closure.reason || null
        );
        return closure;
      },
      () => {
        const idx = memClosures.findIndex(x => x.id === closure.id || (x.restaurantId === closure.restaurantId && x.closureDate === closure.closureDate));
        if (idx >= 0) memClosures[idx] = closure;
        else memClosures.push(closure);
        return closure;
      }
    );
  },

  // RESERVATIONS & REAL DATABASE SLOT CAPACITY ENGINE
  getReservations: (filter?: { restaurantId?: string; customerId?: string }): Reservation[] => {
    return safeQuery(
      () => {
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
      () => {
        let list = [...memReservations];
        if (filter?.restaurantId) list = list.filter(r => r.restaurantId === filter.restaurantId);
        if (filter?.customerId) list = list.filter(r => r.customerId === filter.customerId);
        return list;
      }
    );
  },

  getReservationById: (id: string): Reservation | null => {
    return safeQuery(
      () => {
        const row = sqlite.prepare('SELECT * FROM reservations WHERE id = ? OR bookingReference = ?').get(id, id);
        return row ? mapReservation(row) : null;
      },
      () => memReservations.find(r => r.id === id || r.bookingReference === id) || null
    );
  },

  // Check if customer already has an active/upcoming reservation at this restaurant
  getActiveBookingForCustomer: (restaurantId: string, customerId: string, date: string): Reservation | null => {
    return safeQuery(
      () => {
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
      () => {
        return memReservations.find(r => 
          r.restaurantId === restaurantId &&
          r.customerId === customerId &&
          r.reservationDate >= date &&
          ['confirmed', 'pending', 'checked_in'].includes(r.status)
        ) || null;
      }
    );
  },

  getSlotAvailabilityDetails: (
    restaurantId: string,
    date: string,
    partySize: number
  ): SlotAvailabilityResponse => {
    const rest = serverDb.getRestaurantById(restaurantId);
    if (!rest) {
      return {
        status: 'error',
        message: `Restaurant with identifier "${restaurantId}" could not be found.`,
        slots: [],
        hours: null
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

    // Normalize date format
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
    // Calculate calendar day of week using UTC midday to prevent timezone shifts across systems
    const targetDateUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    const dayOfWeek = targetDateUtc.getUTCDay();

    // Check special holiday/closure
    const closure = serverDb.getRestaurantClosure(rest.id, cleanDate);
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

    // Check opening hours for this day of week
    const hours = serverDb.getRestaurantHours(rest.id);
    const dayHours = hours.find(h => h.dayOfWeek === dayOfWeek);

    if (!dayHours) {
      return {
        status: 'missing_schedule',
        message: `Opening hours have not been configured for this restaurant on ${DAY_NAMES[dayOfWeek]}.`,
        slots: [],
        hours: null,
        restaurant: { id: rest.id, name: rest.name, slug: rest.slug, timezone: rest.timezone }
      };
    }

    if (dayHours.isClosed) {
      return {
        status: 'closed',
        message: 'This restaurant is closed on the selected date.',
        slots: [],
        hours: dayHours,
        restaurant: { id: rest.id, name: rest.name, slug: rest.slug, timezone: rest.timezone }
      };
    }

    if (!dayHours.openTime || !dayHours.closeTime) {
      return {
        status: 'missing_schedule',
        message: 'Opening hours have not been configured for this restaurant.',
        slots: [],
        hours: dayHours,
        restaurant: { id: rest.id, name: rest.name, slug: rest.slug, timezone: rest.timezone }
      };
    }

    const openMinutes = timeToMinutes(dayHours.openTime);
    let closeMinutes = timeToMinutes(dayHours.closeTime);
    // Overnight operating hours support (e.g. 17:00 to 02:00)
    if (closeMinutes <= openMinutes) {
      closeMinutes += 24 * 60;
    }

    const slotDuration = rest.slotDurationMinutes || 90;
    const intervalMinutes = 30; // standard 30 min intervals

    const slotTimes: string[] = [];
    for (let m = openMinutes; m + slotDuration <= closeMinutes; m += intervalMinutes) {
      slotTimes.push(minutesToTime(m % (24 * 60)));
    }

    if (slotTimes.length === 0) {
      return {
        status: 'no_slots',
        message: 'No reservation times are available for this date. Please try another date.',
        slots: [],
        hours: dayHours,
        restaurant: { id: rest.id, name: rest.name, slug: rest.slug, timezone: rest.timezone }
      };
    }

    const tables = serverDb.getTables(rest.id).filter(t => t.isActive);
    const totalCapacity = rest.totalSeatingCapacity || 40;

    // Fetch active reservations for this calendar date
    const dateReservations = serverDb.getReservations({ restaurantId: rest.id }).filter(
      r => r.reservationDate === cleanDate && r.status !== 'cancelled' && r.status !== 'no_show'
    );

    // Current local time at restaurant timezone
    const restaurantTimezone = rest.timezone || 'America/New_York';
    let isTodayAtRestaurant = false;
    let currentRestaurantMinutes = -1;
    try {
      const nowFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: restaurantTimezone });
      const todayInTz = nowFormatter.format(new Date());
      isTodayAtRestaurant = (cleanDate === todayInTz);

      const timeFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: restaurantTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const timeParts = timeFormatter.format(new Date()).split(':').map(Number);
      if (timeParts.length === 2 && !isNaN(timeParts[0]) && !isNaN(timeParts[1])) {
        currentRestaurantMinutes = timeParts[0] * 60 + timeParts[1];
      }
    } catch (e) {
      const now = new Date();
      const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      isTodayAtRestaurant = (cleanDate === localDateStr);
      currentRestaurantMinutes = now.getHours() * 60 + now.getMinutes();
    }

    const minLeadTimeBuffer = rest.bufferTimeMinutes || 15;
    const results: TimeSlotAvailability[] = [];

    for (const time of slotTimes) {
      const slotStart = timeToMinutes(time);
      const slotEnd = slotStart + slotDuration;

      // Check if slot has already passed for today
      if (isTodayAtRestaurant && currentRestaurantMinutes >= 0) {
        if (slotStart < currentRestaurantMinutes + minLeadTimeBuffer) {
          results.push({
            time,
            formattedTime: formatTime12h(time),
            isAvailable: false,
            reason: 'This reservation time has already passed for today.',
            remainingSeats: 0,
            maxPartyAllowed: 0
          });
          continue;
        }
      }

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

        if (tables.length > 0 && candidateTables.length === 0) {
          isAvailable = false;
          reason = `No single available table found with at least ${partySize} seats for this slot.`;
        } else if (candidateTables.length > 0) {
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

    const anyAvailable = results.some(s => s.isAvailable);

    return {
      status: anyAvailable ? 'available' : 'no_slots',
      message: anyAvailable
        ? 'Reservation slots available.'
        : 'No reservation times are available for this date. Please try another date.',
      slots: results,
      hours: dayHours,
      restaurant: { id: rest.id, name: rest.name, slug: rest.slug, timezone: rest.timezone }
    };
  },

  checkSlotAvailability: (restaurantId: string, date: string, partySize: number): TimeSlotAvailability[] => {
    const details = serverDb.getSlotAvailabilityDetails(restaurantId, date, partySize);
    return details.slots;
  },

  // Real-time Cinema-Style Table & Seat Availability Engine
  getTableSeatsAvailability: (
    restaurantId: string, 
    date: string, 
    time: string, 
    partySize: number = 2
  ): TableSeatStatus[] => {
    const rest = serverDb.getRestaurantById(restaurantId);
    if (!rest) return [];

    const tables = serverDb.getTables(restaurantId);
    const slotDuration = rest.slotDurationMinutes || 90;
    const reqStart = timeToMinutes(time);
    const reqEnd = reqStart + slotDuration;

    // Active reservations for this restaurant on this date
    const dateReservations = serverDb.getReservations({ restaurantId }).filter(
      r => r.reservationDate === date && r.status !== 'cancelled' && r.status !== 'no_show'
    );

    // Filter to overlapping reservations
    const overlapping = dateReservations.filter(res => {
      const resStart = timeToMinutes(res.startTime);
      const resEnd = timeToMinutes(res.endTime);
      return reqStart < resEnd && reqEnd > resStart;
    });

    const bookedTableMap = new Map<string, { bookingRef: string; seats?: number[] }>();
    for (const res of overlapping) {
      if (res.assignedTableId) {
        bookedTableMap.set(res.assignedTableId, {
          bookingRef: res.bookingReference,
          seats: res.assignedSeatNumbers
        });
      }
    }

    const now = Date.now();
    // Prune expired seat holds
    for (const [key, hold] of Array.from(seatHolds.entries())) {
      if (hold.expiresAt <= now) {
        seatHolds.delete(key);
      }
    }

    return tables.map(tab => {
      const bookingInfo = bookedTableMap.get(tab.id);
      const isBooked = Boolean(bookingInfo);

      // Check if table or seats are currently held
      const holdKeyPrefix = `${restaurantId}_${date}_${time}_${tab.id}`;
      const activeHold = seatHolds.get(holdKeyPrefix);
      const isHeld = Boolean(activeHold && activeHold.expiresAt > now);

      let status: TableSeatStatus['status'] = 'available';
      if (!tab.isActive) {
        status = 'unavailable';
      } else if (isBooked) {
        status = 'booked';
      } else if (isHeld) {
        status = 'held';
      }

      // Generate individual seats (like cinema seats 1..capacity)
      const bookedSeatsSet = new Set(bookingInfo?.seats || []);
      const seats = Array.from({ length: tab.capacity }).map((_, idx) => {
        const seatNumber = idx + 1;
        const seatId = `${tab.id}-s${seatNumber}`;
        const seatHold = seatHolds.get(`${holdKeyPrefix}_s${seatNumber}`);

        let seatStatus: TableSeatStatus['status'] = status;
        if (status === 'available') {
          if (bookedSeatsSet.has(seatNumber)) {
            seatStatus = 'booked';
          } else if (seatHold && seatHold.expiresAt > now) {
            seatStatus = 'held';
          }
        }

        return {
          seatNumber,
          seatId,
          status: seatStatus
        };
      });

      return {
        tableId: tab.id,
        tableNumber: tab.tableNumber,
        capacity: tab.capacity,
        shape: tab.shape || 'rectangle',
        locationArea: tab.locationArea,
        isActive: tab.isActive,
        posX: tab.posX !== undefined ? tab.posX : 50,
        posY: tab.posY !== undefined ? tab.posY : 50,
        status,
        heldExpiresAt: activeHold?.expiresAt,
        bookedByReference: bookingInfo?.bookingRef,
        seats
      };
    });
  },

  // Temporary Seat Hold mechanism (e.g. 5 minutes cinema-style hold)
  holdSeats: (data: {
    restaurantId: string;
    date: string;
    time: string;
    tableId: string;
    seatNumbers?: number[];
    holdToken: string;
    durationSeconds?: number;
  }): { success: boolean; expiresAt?: number; error?: string } => {
    const { restaurantId, date, time, tableId, seatNumbers, holdToken, durationSeconds = 300 } = data;
    const availability = serverDb.getTableSeatsAvailability(restaurantId, date, time);
    const targetTable = availability.find(t => t.tableId === tableId);

    if (!targetTable || !targetTable.isActive) {
      return { success: false, error: 'Table is not available for seating.' };
    }

    if (targetTable.status === 'booked') {
      return { success: false, error: `Table ${targetTable.tableNumber} is already booked for this time.` };
    }

    const expiresAt = Date.now() + (durationSeconds * 1000);
    const holdKeyPrefix = `${restaurantId}_${date}_${time}_${tableId}`;
    seatHolds.set(holdKeyPrefix, { token: holdToken, expiresAt });

    if (seatNumbers && seatNumbers.length > 0) {
      for (const sNum of seatNumbers) {
        seatHolds.set(`${holdKeyPrefix}_s${sNum}`, { token: holdToken, expiresAt });
      }
    }

    return { success: true, expiresAt };
  },

  releaseHold: (restaurantId: string, date: string, time: string, tableId: string, holdToken?: string) => {
    const holdKeyPrefix = `${restaurantId}_${date}_${time}_${tableId}`;
    const existing = seatHolds.get(holdKeyPrefix);
    if (!holdToken || (existing && existing.token === holdToken)) {
      seatHolds.delete(holdKeyPrefix);
      for (let s = 1; s <= 20; s++) {
        seatHolds.delete(`${holdKeyPrefix}_s${s}`);
      }
    }
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
    selectedTableId?: string;
    selectedSeats?: number[];
    holdToken?: string;
    specialRequests?: string;
    items?: { menuItemId: string; quantity: number }[];
  }): { success: boolean; reservation?: Reservation; error?: string } => {
    const restaurant = serverDb.getRestaurantById(data.restaurantId);
    if (!restaurant) {
      return { success: false, error: 'Restaurant not found.' };
    }

    const reservationDate = (data.reservationDate || (data as any).date || '').trim();
    if (!reservationDate) {
      return { success: false, error: 'A valid reservation date (YYYY-MM-DD) is required.' };
    }
    const customerId = data.customerId || (data.customerEmail ? 'cust-' + data.customerEmail.toLowerCase().replace(/[^a-z0-9]/g, '') : `cust-${Date.now()}`);
    data.reservationDate = reservationDate;
    data.customerId = customerId;

    // Server-side validation of party size
    if (data.partySize < (restaurant.minPartySize || 1)) {
      return { success: false, error: `Party size must be at least ${restaurant.minPartySize}.` };
    }
    if (data.partySize > (restaurant.maxPartySize || 20)) {
      return { success: false, error: `Party size cannot exceed ${restaurant.maxPartySize}.` };
    }

    // Duplicate check: prevent duplicate active reservation for same customer + restaurant + date + time
    const existingDuplicate = serverDb.getReservations({ restaurantId: restaurant.id, customerId: data.customerId }).find(
      r => r.reservationDate === data.reservationDate && r.startTime === data.startTime && ['pending', 'confirmed'].includes(r.status)
    );
    if (existingDuplicate) {
      return {
        success: false,
        error: `You already have an active booking (${existingDuplicate.bookingReference}) for this restaurant at ${data.startTime}.`
      };
    }

    // Capacity & availability verification against real disk database
    const availability = serverDb.getSlotAvailabilityDetails(restaurant.id, data.reservationDate, data.partySize);
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

    // Validate table selection & double booking prevention
    let assignedTableId = data.selectedTableId || targetSlot.suggestedTableId;
    let assignedTableName: string | undefined;
    let assignedSeatNumbers: number[] | undefined = data.selectedSeats;

    if (assignedTableId) {
      const tables = serverDb.getTables(data.restaurantId);
      const tab = tables.find(t => t.id === assignedTableId);
      if (!tab || !tab.isActive) {
        return { success: false, error: 'The selected table is currently unavailable or inactive.' };
      }

      // Check if this table has an overlapping reservation
      const overlappingRes = serverDb.getReservations({ restaurantId: data.restaurantId }).find(res => {
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

      // If customer did not specify seats, default to [1..partySize]
      if (!assignedSeatNumbers || assignedSeatNumbers.length === 0) {
        assignedSeatNumbers = Array.from({ length: Math.min(data.partySize, tab.capacity) }, (_, i) => i + 1);
      }
    }

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

    safeMutation(
      () => {
        sqlite.prepare(`
          INSERT INTO reservations (
            id, bookingReference, restaurantId, restaurantName, restaurantSlug, customerId,
            customerName, customerEmail, customerPhone, partySize, reservationDate, startTime,
            endTime, status, assignedTableId, assignedTableName, assignedSeatNumbers, specialRequests, orderSubtotal,
            orderTax, estimatedTotal, items, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          newReservation.id, newReservation.bookingReference, newReservation.restaurantId,
          newReservation.restaurantName || null, newReservation.restaurantSlug || null,
          newReservation.customerId, newReservation.customerName, newReservation.customerEmail,
          newReservation.customerPhone, newReservation.partySize, newReservation.reservationDate,
          newReservation.startTime, newReservation.endTime, newReservation.status,
          newReservation.assignedTableId || null, newReservation.assignedTableName || null,
          assignedSeatNumbers ? JSON.stringify(assignedSeatNumbers) : null,
          newReservation.specialRequests || null, newReservation.orderSubtotal, newReservation.orderTax,
          newReservation.estimatedTotal, JSON.stringify(newReservation.items),
          newReservation.createdAt, newReservation.updatedAt
        );
      },
      () => {
        memReservations.unshift(newReservation);
      }
    );

    // Release any temporary hold now that booking is confirmed
    if (assignedTableId) {
      serverDb.releaseHold(data.restaurantId, data.reservationDate, data.startTime, assignedTableId, data.holdToken);
    }

    return { success: true, reservation: newReservation };
  },

  updateReservationStatus: (id: string, status: ReservationStatus, cancellationReason?: string): Reservation | null => {
    const existing = serverDb.getReservationById(id);
    if (!existing) return null;

    const cancelledAt = status === 'cancelled' ? new Date().toISOString() : existing.cancelledAt;
    const reason = status === 'cancelled' ? (cancellationReason || 'Cancelled by guest or host') : existing.cancellationReason;

    return safeMutation(
      () => {
        sqlite.prepare(`
          UPDATE reservations 
          SET status = ?, cancellationReason = ?, cancelledAt = ?, updatedAt = ?
          WHERE id = ?
        `).run(status, reason || null, cancelledAt || null, new Date().toISOString(), id);
        return serverDb.getReservationById(id);
      },
      () => {
        const found = memReservations.find(r => r.id === id || r.bookingReference === id);
        if (found) {
          found.status = status;
          found.cancellationReason = reason;
          found.cancelledAt = cancelledAt;
          found.updatedAt = new Date().toISOString();
          return found;
        }
        return null;
      }
    );
  },

  assignReservationTable: (reservationId: string, tableId: string): Reservation | null => {
    const existing = serverDb.getReservationById(reservationId);
    if (!existing) return null;

    const tables = serverDb.getTables(existing.restaurantId);
    const table = tables.find(t => t.id === tableId);
    const tableName = table ? `${table.tableNumber} (Cap: ${table.capacity})` : null;

    return safeMutation(
      () => {
        sqlite.prepare(`
          UPDATE reservations SET assignedTableId = ?, assignedTableName = ?, updatedAt = ? WHERE id = ?
        `).run(tableId, tableName, new Date().toISOString(), reservationId);
        return serverDb.getReservationById(reservationId);
      },
      () => {
        const found = memReservations.find(r => r.id === reservationId || r.bookingReference === reservationId);
        if (found) {
          found.assignedTableId = tableId;
          found.assignedTableName = tableName || undefined;
          found.updatedAt = new Date().toISOString();
          return found;
        }
        return null;
      }
    );
  },

  // USERS
  getUsers: (): UserProfile[] => {
    return safeQuery(
      () => sqlite.prepare('SELECT * FROM users').all() as UserProfile[],
      () => memUsers
    );
  },

  getUserById: (id: string): UserProfile | null => {
    return safeQuery(
      () => sqlite.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserProfile | null,
      () => memUsers.find(u => u.id === id) || null
    );
  },

  getUserByEmail: (email: string): UserProfile | null => {
    return safeQuery(
      () => sqlite.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email) as UserProfile | null,
      () => memUsers.find(u => u.email.toLowerCase() === email.toLowerCase()) || null
    );
  },

  saveUser: (u: UserProfile): UserProfile => {
    return safeMutation(
      () => {
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
      },
      () => {
        const idx = memUsers.findIndex(x => x.id === u.id);
        if (idx >= 0) memUsers[idx] = u;
        else memUsers.push(u);
        return u;
      }
    );
  },

  // REVIEWS & RATINGS SYSTEM
  recalculateRestaurantRating: (restaurantId: string): { rating: number; reviewCount: number } => {
    return safeMutation(
      () => {
        const stats = sqlite.prepare(`
          SELECT 
            COUNT(*) as count,
            AVG(overallRating) as avgRating
          FROM reviews
          WHERE restaurantId = ?
        `).get(restaurantId) as { count: number; avgRating: number | null };

        const reviewCount = stats?.count || 0;
        const rating = reviewCount > 0 ? Number((stats.avgRating || 0).toFixed(1)) : 0;

        sqlite.prepare(`
          UPDATE restaurants 
          SET rating = ?, reviewCount = ? 
          WHERE id = ?
        `).run(rating, reviewCount, restaurantId);

        return { rating, reviewCount };
      },
      () => {
        const revs = memReviews.filter(r => r.restaurantId === restaurantId);
        const reviewCount = revs.length;
        const avg = reviewCount > 0 ? Number((revs.reduce((s, r) => s + r.overallRating, 0) / reviewCount).toFixed(1)) : 0;
        const rest = memRestaurants.find(r => r.id === restaurantId);
        if (rest) {
          rest.rating = avg;
          rest.reviewCount = reviewCount;
        }
        return { rating: avg, reviewCount };
      }
    );
  },

  getReviewStats: (restaurantId: string): ReviewStats => {
    return safeQuery(
      () => {
        const reviews = sqlite.prepare('SELECT * FROM reviews WHERE restaurantId = ?').all(restaurantId) as any[];
        const reviewCount = reviews.length;
        const distribution: { [star: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let sumOverall = 0, sumFood = 0, countFood = 0;
        let sumService = 0, countService = 0;
        let sumAmbience = 0, countAmbience = 0;
        let sumValue = 0, countValue = 0;

        for (const r of reviews) {
          const overall = Math.max(1, Math.min(5, Math.round(Number(r.overallRating))));
          distribution[overall] = (distribution[overall] || 0) + 1;
          sumOverall += Number(r.overallRating);
          if (r.foodRating !== null && r.foodRating !== undefined) { sumFood += Number(r.foodRating); countFood++; }
          if (r.serviceRating !== null && r.serviceRating !== undefined) { sumService += Number(r.serviceRating); countService++; }
          if (r.ambienceRating !== null && r.ambienceRating !== undefined) { sumAmbience += Number(r.ambienceRating); countAmbience++; }
          if (r.valueRating !== null && r.valueRating !== undefined) { sumValue += Number(r.valueRating); countValue++; }
        }

        return {
          averageRating: reviewCount > 0 ? Number((sumOverall / reviewCount).toFixed(1)) : 0,
          reviewCount,
          distribution,
          avgFood: countFood > 0 ? Number((sumFood / countFood).toFixed(1)) : undefined,
          avgService: countService > 0 ? Number((sumService / countService).toFixed(1)) : undefined,
          avgAmbience: countAmbience > 0 ? Number((sumAmbience / countAmbience).toFixed(1)) : undefined,
          avgValue: countValue > 0 ? Number((sumValue / countValue).toFixed(1)) : undefined
        };
      },
      () => {
        const revs = memReviews.filter(r => r.restaurantId === restaurantId);
        const reviewCount = revs.length;
        const distribution: { [star: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let sumOverall = 0, sumFood = 0, countFood = 0;
        let sumService = 0, countService = 0;
        let sumAmbience = 0, countAmbience = 0;
        let sumValue = 0, countValue = 0;

        for (const r of revs) {
          const overall = Math.max(1, Math.min(5, Math.round(r.overallRating)));
          distribution[overall] = (distribution[overall] || 0) + 1;
          sumOverall += r.overallRating;
          if (r.foodRating) { sumFood += r.foodRating; countFood++; }
          if (r.serviceRating) { sumService += r.serviceRating; countService++; }
          if (r.ambienceRating) { sumAmbience += r.ambienceRating; countAmbience++; }
          if (r.valueRating) { sumValue += r.valueRating; countValue++; }
        }

        return {
          averageRating: reviewCount > 0 ? Number((sumOverall / reviewCount).toFixed(1)) : 0,
          reviewCount,
          distribution,
          avgFood: countFood > 0 ? Number((sumFood / countFood).toFixed(1)) : undefined,
          avgService: countService > 0 ? Number((sumService / countService).toFixed(1)) : undefined,
          avgAmbience: countAmbience > 0 ? Number((sumAmbience / countAmbience).toFixed(1)) : undefined,
          avgValue: countValue > 0 ? Number((sumValue / countValue).toFixed(1)) : undefined
        };
      }
    );
  },

  getReviews: (filter: {
    restaurantId?: string;
    customerId?: string;
    reservationId?: string;
    sortBy?: 'recent' | 'highest' | 'lowest';
  }): Review[] => {
    return safeQuery(
      () => {
        let query = `
          SELECT r.*, res.reservationDate as visitDate, res.partySize as partySize
          FROM reviews r
          LEFT JOIN reservations res ON r.reservationId = res.id
          WHERE 1=1
        `;
        const params: any[] = [];
        if (filter.restaurantId) { query += ' AND r.restaurantId = ?'; params.push(filter.restaurantId); }
        if (filter.customerId) { query += ' AND r.customerId = ?'; params.push(filter.customerId); }
        if (filter.reservationId) { query += ' AND r.reservationId = ?'; params.push(filter.reservationId); }
        if (filter.sortBy === 'highest') query += ' ORDER BY r.overallRating DESC, r.createdAt DESC';
        else if (filter.sortBy === 'lowest') query += ' ORDER BY r.overallRating ASC, r.createdAt DESC';
        else query += ' ORDER BY r.createdAt DESC';
        const rows = sqlite.prepare(query).all(...params);
        return rows.map(mapReview);
      },
      () => {
        let list = [...memReviews];
        if (filter.restaurantId) list = list.filter(r => r.restaurantId === filter.restaurantId);
        if (filter.customerId) list = list.filter(r => r.customerId === filter.customerId);
        if (filter.reservationId) list = list.filter(r => r.reservationId === filter.reservationId);
        if (filter.sortBy === 'highest') list.sort((a, b) => b.overallRating - a.overallRating);
        else if (filter.sortBy === 'lowest') list.sort((a, b) => a.overallRating - b.overallRating);
        else list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return list;
      }
    );
  },

  getReviewById: (id: string): Review | null => {
    return safeQuery(
      () => {
        const row = sqlite.prepare(`
          SELECT r.*, res.reservationDate as visitDate, res.partySize as partySize
          FROM reviews r
          LEFT JOIN reservations res ON r.reservationId = res.id
          WHERE r.id = ?
        `).get(id);
        return row ? mapReview(row) : null;
      },
      () => memReviews.find(r => r.id === id) || null
    );
  },

  getReviewByReservationId: (reservationId: string): Review | null => {
    return safeQuery(
      () => {
        const row = sqlite.prepare(`
          SELECT r.*, res.reservationDate as visitDate, res.partySize as partySize
          FROM reviews r
          LEFT JOIN reservations res ON r.reservationId = res.id
          WHERE r.reservationId = ?
        `).get(reservationId);
        return row ? mapReview(row) : null;
      },
      () => memReviews.find(r => r.reservationId === reservationId) || null
    );
  },

  createReview: (data: {
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
  }): { success: boolean; review?: Review; error?: string } => {
    // 1. Verify reservation existence & completion
    const reservation = serverDb.getReservationById(data.reservationId);
    if (!reservation) {
      return { success: false, error: 'Reservation not found.' };
    }

    if (reservation.customerId !== data.customerId) {
      return { success: false, error: 'Unauthorized: You can only review your own reservations.' };
    }

    if (reservation.status !== 'completed') {
      return { 
        success: false, 
        error: `Only reservations with 'completed' dining status can be reviewed. Current status is '${reservation.status}'.` 
      };
    }

    // 2. Prevent restaurant owners from reviewing their own restaurant
    const rest = serverDb.getRestaurantById(data.restaurantId);
    if (rest && rest.ownerId === data.customerId) {
      return { success: false, error: 'Restaurant owners cannot review their own restaurant.' };
    }

    // 3. Check for duplicate review on this reservation
    const existing = serverDb.getReviewByReservationId(data.reservationId);
    if (existing) {
      return { success: false, error: 'This completed reservation has already been reviewed.' };
    }

    // 4. Validate rating ranges (1-5)
    if (!data.overallRating || data.overallRating < 1 || data.overallRating > 5) {
      return { success: false, error: 'Overall star rating is required and must be between 1 and 5.' };
    }

    const validateRating = (val?: number) => {
      if (val === undefined || val === null) return true;
      return typeof val === 'number' && val >= 1 && val <= 5;
    };

    if (!validateRating(data.foodRating) || !validateRating(data.serviceRating) ||
        !validateRating(data.ambienceRating) || !validateRating(data.valueRating)) {
      return { success: false, error: 'Detailed category ratings must be between 1 and 5.' };
    }

    const id = `rev-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const createdReview: Review = {
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
      comment: data.comment ? data.comment.trim() : undefined,
      tags: data.tags && Array.isArray(data.tags) ? data.tags : undefined,
      createdAt: now,
      updatedAt: now,
      visitDate: reservation.reservationDate,
      partySize: reservation.partySize
    };

    try {
      safeMutation(
        () => {
          sqlite.prepare(`
            INSERT INTO reviews (
              id, restaurantId, customerId, customerName, customerEmail, reservationId,
              overallRating, foodRating, serviceRating, ambienceRating, valueRating,
              comment, tags, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            id,
            data.restaurantId,
            data.customerId,
            data.customerName || reservation.customerName,
            data.customerEmail || reservation.customerEmail,
            data.reservationId,
            Math.round(data.overallRating),
            data.foodRating ? Math.round(data.foodRating) : null,
            data.serviceRating ? Math.round(data.serviceRating) : null,
            data.ambienceRating ? Math.round(data.ambienceRating) : null,
            data.valueRating ? Math.round(data.valueRating) : null,
            data.comment ? data.comment.trim() : null,
            data.tags && Array.isArray(data.tags) ? JSON.stringify(data.tags) : null,
            now,
            now
          );
        },
        () => {
          memReviews.unshift({ ...createdReview });
        }
      );

      // Recalculate restaurant overall rating & review count
      serverDb.recalculateRestaurantRating(data.restaurantId);

      const created = serverDb.getReviewById(id);
      return { success: true, review: created || createdReview };
    } catch (err: any) {
      return { success: false, error: err.message || 'Database error creating review' };
    }
  },

  updateReview: (id: string, customerId: string, data: {
    overallRating?: number;
    foodRating?: number;
    serviceRating?: number;
    ambienceRating?: number;
    valueRating?: number;
    comment?: string;
    tags?: string[];
  }): { success: boolean; review?: Review; error?: string } => {
    const existing = serverDb.getReviewById(id);
    if (!existing) {
      return { success: false, error: 'Review not found.' };
    }

    if (existing.customerId !== customerId) {
      return { success: false, error: 'Unauthorized: You can only edit your own reviews.' };
    }

    const overallRating = data.overallRating !== undefined ? data.overallRating : existing.overallRating;
    if (!overallRating || overallRating < 1 || overallRating > 5) {
      return { success: false, error: 'Overall star rating must be between 1 and 5.' };
    }

    const foodRating = data.foodRating !== undefined ? (data.foodRating || null) : (existing.foodRating || null);
    const serviceRating = data.serviceRating !== undefined ? (data.serviceRating || null) : (existing.serviceRating || null);
    const ambienceRating = data.ambienceRating !== undefined ? (data.ambienceRating || null) : (existing.ambienceRating || null);
    const valueRating = data.valueRating !== undefined ? (data.valueRating || null) : (existing.valueRating || null);
    const comment = data.comment !== undefined ? (data.comment?.trim() || null) : (existing.comment || null);
    const tags = data.tags !== undefined ? JSON.stringify(data.tags) : JSON.stringify(existing.tags || []);
    const now = new Date().toISOString();

    try {
      safeMutation(
        () => {
          sqlite.prepare(`
            UPDATE reviews SET 
              overallRating = ?, foodRating = ?, serviceRating = ?, ambienceRating = ?, valueRating = ?,
              comment = ?, tags = ?, updatedAt = ?
            WHERE id = ?
          `).run(
            Math.round(overallRating),
            foodRating ? Math.round(foodRating) : null,
            serviceRating ? Math.round(serviceRating) : null,
            ambienceRating ? Math.round(ambienceRating) : null,
            valueRating ? Math.round(valueRating) : null,
            comment,
            tags,
            now,
            id
          );
        },
        () => {
          const idx = memReviews.findIndex(r => r.id === id);
          if (idx !== -1) {
            memReviews[idx] = {
              ...memReviews[idx],
              overallRating: Math.round(overallRating),
              foodRating: foodRating ? Math.round(foodRating) : undefined,
              serviceRating: serviceRating ? Math.round(serviceRating) : undefined,
              ambienceRating: ambienceRating ? Math.round(ambienceRating) : undefined,
              valueRating: valueRating ? Math.round(valueRating) : undefined,
              comment: comment || undefined,
              tags: data.tags !== undefined ? data.tags : memReviews[idx].tags,
              updatedAt: now
            };
          }
        }
      );

      // Recalculate
      serverDb.recalculateRestaurantRating(existing.restaurantId);

      const updated = serverDb.getReviewById(id);
      return { success: true, review: updated! };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error updating review' };
    }
  },

  deleteReview: (id: string, customerId: string): { success: boolean; error?: string } => {
    const existing = serverDb.getReviewById(id);
    if (!existing) {
      return { success: false, error: 'Review not found.' };
    }

    if (existing.customerId !== customerId) {
      return { success: false, error: 'Unauthorized: You can only delete your own reviews.' };
    }

    try {
      safeMutation(
        () => {
          sqlite.prepare('DELETE FROM reviews WHERE id = ?').run(id);
        },
        () => {
          const idx = memReviews.findIndex(r => r.id === id);
          if (idx !== -1) memReviews.splice(idx, 1);
        }
      );
      // Recalculate restaurant overall rating & count
      serverDb.recalculateRestaurantRating(existing.restaurantId);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error deleting review' };
    }
  },

  respondToReview: (reviewId: string, ownerId: string, responseText: string): { success: boolean; review?: Review; error?: string } => {
    const review = serverDb.getReviewById(reviewId);
    if (!review) {
      return { success: false, error: 'Review not found.' };
    }

    const rest = serverDb.getRestaurantById(review.restaurantId);
    if (!rest || rest.ownerId !== ownerId) {
      return { success: false, error: 'Unauthorized: Only the verified owner of this restaurant can respond to this review.' };
    }

    const now = new Date().toISOString();
    safeMutation(
      () => {
        sqlite.prepare(`
          UPDATE reviews 
          SET ownerResponse = ?, ownerRespondedAt = ?, updatedAt = ?
          WHERE id = ?
        `).run(responseText.trim(), now, now, reviewId);
      },
      () => {
        const idx = memReviews.findIndex(r => r.id === reviewId);
        if (idx !== -1) {
          memReviews[idx].ownerResponse = responseText.trim();
          memReviews[idx].ownerRespondedAt = now;
          memReviews[idx].updatedAt = now;
        }
      }
    );

    const updated = serverDb.getReviewById(reviewId);
    return { success: true, review: updated! };
  },

  reportReview: (reviewId: string, reporterId: string, reason: string): { success: boolean; review?: Review; error?: string } => {
    const review = serverDb.getReviewById(reviewId);
    if (!review) {
      return { success: false, error: 'Review not found.' };
    }

    const now = new Date().toISOString();
    safeMutation(
      () => {
        sqlite.prepare(`
          UPDATE reviews 
          SET isReported = 1, reportReason = ?, reportedAt = ?, updatedAt = ?
          WHERE id = ?
        `).run(reason.trim(), now, now, reviewId);
      },
      () => {
        const idx = memReviews.findIndex(r => r.id === reviewId);
        if (idx !== -1) {
          memReviews[idx].isReported = true;
          memReviews[idx].reportReason = reason.trim();
          memReviews[idx].reportedAt = now;
          memReviews[idx].updatedAt = now;
        }
      }
    );

    const updated = serverDb.getReviewById(reviewId);
    return { success: true, review: updated! };
  }
};

// Helpers
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

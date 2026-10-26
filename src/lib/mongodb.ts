import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import dns from 'dns';

// Ensure reliable SRV DNS resolution on Windows and local dev networks
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {
  // ignore
}

// Ensure this module is only executed in a server environment
if (typeof window !== 'undefined') {
  throw new Error('src/lib/mongodb.ts must never be imported or executed in client browser code.');
}

function getMongoUri(): string {
  if (!process.env.MONGODB_URI && typeof process !== 'undefined') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path');
      const envPath = path.resolve(process.cwd(), '.env.local');
      if (fs.existsSync(envPath)) {
        const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eq = trimmed.indexOf('=');
          if (eq > 0) {
            const key = trimmed.slice(0, eq).trim();
            let val = trimmed.slice(eq + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }
  return process.env.MONGODB_URI || '';
}

function getDbName(): string {
  return process.env.MONGODB_DB_NAME || 'tablereserve';
}

const options: MongoClientOptions = {
  maxPoolSize: 10,
  minPoolSize: 0,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  retryReads: true
};

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var _mongoIndexesEnsured: boolean | undefined;
}

let clientPromise: Promise<MongoClient> | null = null;

export function isMongoConfigured(): boolean {
  const currentUri = getMongoUri();
  return Boolean(currentUri && currentUri.trim().length > 0 && currentUri.startsWith('mongodb'));
}

export function getMongoClientPromise(): Promise<MongoClient> {
  const currentUri = getMongoUri();
  if (!isMongoConfigured()) {
    throw new Error('MONGODB_URI is not configured in server environment variables.');
  }

  // Reuse existing promise across warm serverless Netlify function invocations
  if (!global._mongoClientPromise) {
    const client = new MongoClient(currentUri, options);
    global._mongoClientPromise = client.connect().catch((err) => {
      // Clear global promise on connection error so subsequent calls can retry
      global._mongoClientPromise = undefined;
      throw err;
    });
  }

  clientPromise = global._mongoClientPromise;
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClientPromise();
  const db = client.db(getDbName());

  // Lazy ensure indexes once per process lifetime
  if (!global._mongoIndexesEnsured) {
    ensureMongoIndexes(db).catch((err) => {
      console.warn('[MongoDB] Index creation warning:', err.message);
    });
    global._mongoIndexesEnsured = true;
  }

  return db;
}

// Collection constants
export const COLLECTIONS = {
  USERS: 'users',
  RESTAURANTS: 'restaurants',
  RESTAURANT_HOURS: 'restaurant_hours',
  RESTAURANT_CLOSURES: 'restaurant_closures',
  TABLES: 'tables',
  MENU_CATEGORIES: 'menu_categories',
  MENU_ITEMS: 'menu_items',
  RESERVATIONS: 'reservations',
  REVIEWS: 'reviews'
} as const;

/**
 * Creates and verifies all necessary production indexes and unique constraints
 */
export async function ensureMongoIndexes(db: Db): Promise<void> {
  try {
    // 1. Users collection
    await db.collection(COLLECTIONS.USERS).createIndexes([
      { key: { email: 1 }, unique: true, name: 'uniq_user_email' },
      { key: { role: 1 }, name: 'idx_user_role' },
      { key: { id: 1 }, unique: true, name: 'uniq_user_id' }
    ]);

    // 2. Restaurants collection
    await db.collection(COLLECTIONS.RESTAURANTS).createIndexes([
      { key: { slug: 1 }, unique: true, name: 'uniq_restaurant_slug' },
      { key: { id: 1 }, unique: true, name: 'uniq_restaurant_id' },
      { key: { ownerId: 1 }, name: 'idx_restaurant_owner' },
      { key: { status: 1 }, name: 'idx_restaurant_status' },
      { key: { name: 1 }, name: 'idx_restaurant_name' }
    ]);

    // 3. Restaurant Hours
    await db.collection(COLLECTIONS.RESTAURANT_HOURS).createIndexes([
      { key: { id: 1 }, unique: true, name: 'uniq_hour_id' },
      { key: { restaurantId: 1, dayOfWeek: 1 }, name: 'idx_restaurant_day' }
    ]);

    // 4. Restaurant Closures
    await db.collection(COLLECTIONS.RESTAURANT_CLOSURES).createIndexes([
      { key: { id: 1 }, unique: true, name: 'uniq_closure_id' },
      { key: { restaurantId: 1, closureDate: 1 }, name: 'idx_restaurant_closure_date' }
    ]);

    // 5. Dining Tables
    await db.collection(COLLECTIONS.TABLES).createIndexes([
      { key: { id: 1 }, unique: true, name: 'uniq_table_id' },
      { key: { restaurantId: 1, isActive: 1 }, name: 'idx_tables_active' },
      { key: { restaurantId: 1, tableNumber: 1 }, name: 'idx_tables_restaurant_number' }
    ]);

    // 6. Menu Categories
    await db.collection(COLLECTIONS.MENU_CATEGORIES).createIndexes([
      { key: { id: 1 }, unique: true, name: 'uniq_cat_id' },
      { key: { restaurantId: 1, displayOrder: 1 }, name: 'idx_category_order' }
    ]);

    // 7. Menu Items
    await db.collection(COLLECTIONS.MENU_ITEMS).createIndexes([
      { key: { id: 1 }, unique: true, name: 'uniq_item_id' },
      { key: { restaurantId: 1, categoryId: 1, isAvailable: 1 }, name: 'idx_menu_items_cat' }
    ]);

    // 8. Reservations
    await db.collection(COLLECTIONS.RESERVATIONS).createIndexes([
      { key: { bookingReference: 1 }, unique: true, name: 'uniq_booking_ref' },
      { key: { id: 1 }, unique: true, name: 'uniq_reservation_id' },
      { key: { restaurantId: 1, reservationDate: 1, status: 1 }, name: 'idx_res_rest_date_status' },
      { key: { customerId: 1, reservationDate: 1 }, name: 'idx_res_customer_date' },
      { key: { assignedTableId: 1, reservationDate: 1 }, name: 'idx_res_table_date' }
    ]);

    // 9. Reviews
    await db.collection(COLLECTIONS.REVIEWS).createIndexes([
      { key: { reservationId: 1 }, unique: true, name: 'uniq_review_reservation' },
      { key: { id: 1 }, unique: true, name: 'uniq_review_id' },
      { key: { restaurantId: 1, createdAt: -1 }, name: 'idx_reviews_restaurant_date' },
      { key: { customerId: 1 }, name: 'idx_reviews_customer' }
    ]);
  } catch (err: any) {
    // Indexes might already exist or be in build state, log warning
    console.warn('[MongoDB] Index creation encountered:', err.message);
  }
}

/**
 * Health check helper for testing connection status
 */
export async function checkMongoConnection(): Promise<{
  ok: boolean;
  message: string;
  database?: string;
  pingMs?: number;
}> {
  if (!isMongoConfigured()) {
    return {
      ok: false,
      message: 'MONGODB_URI is not set in environment variables.'
    };
  }

  const start = Date.now();
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    const pingMs = Date.now() - start;
    return {
      ok: true,
      message: 'MongoDB Atlas connection active and healthy.',
      database: dbName,
      pingMs
    };
  } catch (err: any) {
    return {
      ok: false,
      message: `Failed to connect to MongoDB: ${err.message}`
    };
  }
}

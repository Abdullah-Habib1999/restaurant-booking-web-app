import path from 'path';
import fs from 'fs';
import dns from 'dns';
import { MongoClient } from 'mongodb';

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {
  // ignore
}
import { hashPassword } from '../src/lib/authCrypto';
import { 
  INITIAL_RESTAURANTS, 
  INITIAL_TABLES, 
  INITIAL_HOURS, 
  INITIAL_MENU_CATEGORIES, 
  INITIAL_MENU_ITEMS, 
  INITIAL_RESERVATIONS, 
  INITIAL_REVIEWS, 
  INITIAL_USERS 
} from '../src/data/seed';

// Collection definitions
const COLLECTIONS = {
  USERS: 'users',
  RESTAURANTS: 'restaurants',
  RESTAURANT_HOURS: 'restaurant_hours',
  RESTAURANT_CLOSURES: 'restaurant_closures',
  TABLES: 'tables',
  MENU_CATEGORIES: 'menu_categories',
  MENU_ITEMS: 'menu_items',
  RESERVATIONS: 'reservations',
  REVIEWS: 'reviews'
};

function loadLocalEnv() {
  if (process.env.MONGODB_URI) return;
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
}

async function runMigration() {
  loadLocalEnv();
  console.log('========================================================');
  console.log('TABLERESERVE: SQLITE TO MONGODB ATLAS MIGRATION UTILITY');
  console.log('========================================================\n');

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'tablereserve';

  if (!uri) {
    console.error('ERROR: MONGODB_URI environment variable is required to execute migration.');
    console.error('Example: export MONGODB_URI="mongodb+srv://<user>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority"');
    process.exit(1);
  }

  console.log(`Connecting to MongoDB cluster... (Database: "${dbName}")`);
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 10000
  });

  try {
    await client.connect();
    console.log('[SUCCESS] Connected to MongoDB Atlas cluster.\n');
    const db = client.db(dbName);

    // 1. Create Indexes & Unique Constraints
    console.log('--- Step 1: Ensuring Collections & Indexes ---');
    await db.collection(COLLECTIONS.USERS).createIndexes([
      { key: { email: 1 }, unique: true, name: 'uniq_user_email' },
      { key: { id: 1 }, unique: true, name: 'uniq_user_id' },
      { key: { role: 1 }, name: 'idx_user_role' }
    ]);
    await db.collection(COLLECTIONS.RESTAURANTS).createIndexes([
      { key: { slug: 1 }, unique: true, name: 'uniq_restaurant_slug' },
      { key: { id: 1 }, unique: true, name: 'uniq_restaurant_id' },
      { key: { ownerId: 1 }, name: 'idx_restaurant_owner' },
      { key: { status: 1 }, name: 'idx_restaurant_status' }
    ]);
    await db.collection(COLLECTIONS.RESTAURANT_HOURS).createIndexes([
      { key: { id: 1 }, unique: true, name: 'uniq_hour_id' },
      { key: { restaurantId: 1, dayOfWeek: 1 }, name: 'idx_hours_restaurant_day' }
    ]);
    await db.collection(COLLECTIONS.RESTAURANT_CLOSURES).createIndexes([
      { key: { id: 1 }, unique: true, name: 'uniq_closure_id' },
      { key: { restaurantId: 1, closureDate: 1 }, name: 'idx_closures_restaurant_date' }
    ]);
    await db.collection(COLLECTIONS.TABLES).createIndexes([
      { key: { id: 1 }, unique: true, name: 'uniq_table_id' },
      { key: { restaurantId: 1, isActive: 1 }, name: 'idx_tables_active' }
    ]);
    await db.collection(COLLECTIONS.MENU_CATEGORIES).createIndexes([
      { key: { id: 1 }, unique: true, name: 'uniq_cat_id' },
      { key: { restaurantId: 1, displayOrder: 1 }, name: 'idx_cat_order' }
    ]);
    await db.collection(COLLECTIONS.MENU_ITEMS).createIndexes([
      { key: { id: 1 }, unique: true, name: 'uniq_item_id' },
      { key: { restaurantId: 1, categoryId: 1, isAvailable: 1 }, name: 'idx_items_cat' }
    ]);
    await db.collection(COLLECTIONS.RESERVATIONS).createIndexes([
      { key: { bookingReference: 1 }, unique: true, name: 'uniq_booking_ref' },
      { key: { id: 1 }, unique: true, name: 'uniq_res_id' },
      { key: { restaurantId: 1, reservationDate: 1, status: 1 }, name: 'idx_res_rest_date' },
      { key: { customerId: 1, reservationDate: 1 }, name: 'idx_res_cust_date' },
      { key: { assignedTableId: 1, reservationDate: 1 }, name: 'idx_res_table_date' }
    ]);
    await db.collection(COLLECTIONS.REVIEWS).createIndexes([
      { key: { reservationId: 1 }, unique: true, name: 'uniq_review_res' },
      { key: { id: 1 }, unique: true, name: 'uniq_review_id' },
      { key: { restaurantId: 1, createdAt: -1 }, name: 'idx_review_rest_date' }
    ]);
    console.log('[PASS] Production indexes established.\n');

    // 2. Determine Data Source: Existing SQLite Database or Seed Data
    const sqlitePath = path.resolve(process.cwd(), 'data', 'tablereserve.db');
    let sqliteDb: any = null;

    if (fs.existsSync(sqlitePath)) {
      try {
        const Database = eval('require')('better-sqlite3');
        sqliteDb = new Database(sqlitePath, { readonly: true });
        console.log(`[INFO] Found local SQLite database at: ${sqlitePath}`);
      } catch (err: any) {
        console.warn(`[WARN] SQLite driver not available or error opening file: ${err.message}. Using code seed store.`);
      }
    } else {
      console.log(`[INFO] No SQLite database file found at ${sqlitePath}. Using seed definitions.`);
    }

    // 3. Migrate Users (with secure password hashing)
    console.log('--- Step 2: Migrating Users ---');
    let usersToMigrate: any[] = [];
    if (sqliteDb) {
      try {
        usersToMigrate = sqliteDb.prepare('SELECT * FROM users').all();
      } catch (e) {
        usersToMigrate = [...INITIAL_USERS];
      }
    } else {
      usersToMigrate = [...INITIAL_USERS];
    }

    let userCount = 0;
    for (const u of usersToMigrate) {
      const cleanEmail = u.email.trim().toLowerCase();
      // Skip known mock attacker/imposter records if any
      if (cleanEmail === 'imposter@attacker.com') continue;

      let password = u.password || 'password123';
      if (!password.startsWith('scrypt$')) {
        password = await hashPassword(password);
      }

      const userDoc = {
        _id: u.id,
        id: u.id,
        email: cleanEmail,
        fullName: u.fullName,
        phone: u.phone || undefined,
        role: u.role || 'customer',
        password,
        ownedRestaurantId: u.ownedRestaurantId || undefined,
        createdAt: u.createdAt || new Date().toISOString()
      };

      await db.collection(COLLECTIONS.USERS).updateOne(
        { id: userDoc.id },
        { $set: userDoc },
        { upsert: true }
      );
      userCount++;
    }
    console.log(`[PASS] Migrated ${userCount} users with scrypt password protection.`);

    // 4. Migrate Restaurants
    console.log('\n--- Step 3: Migrating Restaurants ---');
    let restaurantsToMigrate: any[] = [];
    if (sqliteDb) {
      try {
        restaurantsToMigrate = sqliteDb.prepare('SELECT * FROM restaurants').all();
      } catch {
        restaurantsToMigrate = [...INITIAL_RESTAURANTS];
      }
    } else {
      restaurantsToMigrate = [...INITIAL_RESTAURANTS];
    }

    let restCount = 0;
    for (const r of restaurantsToMigrate) {
      let cuisineType = r.cuisineType;
      if (typeof cuisineType === 'string') {
        try { cuisineType = JSON.parse(cuisineType); } catch { cuisineType = [cuisineType]; }
      }

      const restDoc = {
        _id: r.id,
        id: r.id,
        ownerId: r.ownerId,
        name: r.name,
        slug: r.slug,
        tagline: r.tagline || '',
        description: r.description || '',
        cuisineType: Array.isArray(cuisineType) ? cuisineType : [],
        phone: r.phone,
        email: r.email,
        address: r.address,
        city: r.city,
        postalCode: r.postalCode || '',
        coverImageUrl: r.coverImageUrl,
        logoUrl: r.logoUrl || undefined,
        priceTier: r.priceTier || '$$',
        seatingManagementMode: r.seatingManagementMode || 'individual_tables',
        totalSeatingCapacity: Number(r.totalSeatingCapacity) || 40,
        slotDurationMinutes: Number(r.slotDurationMinutes) || 90,
        bufferTimeMinutes: Number(r.bufferTimeMinutes) || 15,
        advanceBookingDays: Number(r.advanceBookingDays) || 30,
        minPartySize: Number(r.minPartySize) || 1,
        maxPartySize: Number(r.maxPartySize) || 20,
        cancellationPolicy: r.cancellationPolicy || 'Complimentary cancellation up to 2 hours before booking.',
        cancellationCutoffHours: Number(r.cancellationCutoffHours) || 2,
        requiresManualApproval: Boolean(r.requiresManualApproval),
        status: r.status || 'published',
        rejectionReason: r.rejectionReason || undefined,
        reviewedByAdminId: r.reviewedByAdminId || undefined,
        reviewedAt: r.reviewedAt || undefined,
        suspendedAt: r.suspendedAt || undefined,
        suspendedReason: r.suspendedReason || undefined,
        rating: Number(r.rating) || 5.0,
        reviewCount: Number(r.reviewCount) || 0,
        createdAt: r.createdAt || new Date().toISOString()
      };

      await db.collection(COLLECTIONS.RESTAURANTS).updateOne(
        { id: restDoc.id },
        { $set: restDoc },
        { upsert: true }
      );
      restCount++;
    }
    console.log(`[PASS] Migrated ${restCount} restaurants.`);

    // 5. Migrate Restaurant Hours
    console.log('\n--- Step 4: Migrating Restaurant Hours ---');
    let hoursToMigrate: any[] = [];
    if (sqliteDb) {
      try {
        hoursToMigrate = sqliteDb.prepare('SELECT * FROM restaurant_hours').all();
      } catch {
        hoursToMigrate = [...INITIAL_HOURS];
      }
    } else {
      hoursToMigrate = [...INITIAL_HOURS];
    }

    let hoursCount = 0;
    for (const h of hoursToMigrate) {
      const hourDoc = {
        _id: h.id,
        id: h.id,
        restaurantId: h.restaurantId,
        dayOfWeek: Number(h.dayOfWeek),
        openTime: h.openTime,
        closeTime: h.closeTime,
        isClosed: Boolean(h.isClosed)
      };
      await db.collection(COLLECTIONS.RESTAURANT_HOURS).updateOne(
        { id: hourDoc.id },
        { $set: hourDoc },
        { upsert: true }
      );
      hoursCount++;
    }
    console.log(`[PASS] Migrated ${hoursCount} restaurant operating hours.`);

    // 6. Migrate Tables
    console.log('\n--- Step 5: Migrating Dining Tables ---');
    let tablesToMigrate: any[] = [];
    if (sqliteDb) {
      try {
        tablesToMigrate = sqliteDb.prepare('SELECT * FROM tables').all();
      } catch {
        tablesToMigrate = [...INITIAL_TABLES];
      }
    } else {
      tablesToMigrate = [...INITIAL_TABLES];
    }

    let tableCount = 0;
    for (const t of tablesToMigrate) {
      const tableDoc = {
        _id: t.id,
        id: t.id,
        restaurantId: t.restaurantId,
        tableNumber: t.tableNumber,
        capacity: Number(t.capacity),
        locationArea: t.locationArea || 'Main Dining Room',
        isActive: Boolean(t.isActive),
        shape: t.shape || 'rectangle',
        posX: Number(t.posX ?? 50),
        posY: Number(t.posY ?? 50),
        rotation: Number(t.rotation ?? 0)
      };
      await db.collection(COLLECTIONS.TABLES).updateOne(
        { id: tableDoc.id },
        { $set: tableDoc },
        { upsert: true }
      );
      tableCount++;
    }
    console.log(`[PASS] Migrated ${tableCount} dining tables.`);

    // 7. Migrate Menu Categories
    console.log('\n--- Step 6: Migrating Menu Categories ---');
    let categoriesToMigrate: any[] = [];
    if (sqliteDb) {
      try {
        categoriesToMigrate = sqliteDb.prepare('SELECT * FROM menu_categories').all();
      } catch {
        categoriesToMigrate = [...INITIAL_MENU_CATEGORIES];
      }
    } else {
      categoriesToMigrate = [...INITIAL_MENU_CATEGORIES];
    }

    let catCount = 0;
    for (const c of categoriesToMigrate) {
      const catDoc = {
        _id: c.id,
        id: c.id,
        restaurantId: c.restaurantId,
        name: c.name,
        displayOrder: Number(c.displayOrder || 0),
        description: c.description || undefined,
        isActive: Boolean(c.isActive)
      };
      await db.collection(COLLECTIONS.MENU_CATEGORIES).updateOne(
        { id: catDoc.id },
        { $set: catDoc },
        { upsert: true }
      );
      catCount++;
    }
    console.log(`[PASS] Migrated ${catCount} menu categories.`);

    // 8. Migrate Menu Items
    console.log('\n--- Step 7: Migrating Menu Items ---');
    let itemsToMigrate: any[] = [];
    if (sqliteDb) {
      try {
        itemsToMigrate = sqliteDb.prepare('SELECT * FROM menu_items').all();
      } catch {
        itemsToMigrate = [...INITIAL_MENU_ITEMS];
      }
    } else {
      itemsToMigrate = [...INITIAL_MENU_ITEMS];
    }

    let itemCount = 0;
    for (const m of itemsToMigrate) {
      const itemDoc = {
        _id: m.id,
        id: m.id,
        restaurantId: m.restaurantId,
        categoryId: m.categoryId,
        name: m.name,
        description: m.description || '',
        price: Number(m.price),
        imageUrl: m.imageUrl || undefined,
        isAvailable: Boolean(m.isAvailable),
        isVegetarian: Boolean(m.isVegetarian),
        isNonVegetarian: Boolean(m.isNonVegetarian),
        isVegan: Boolean(m.isVegan),
        isGlutenFree: Boolean(m.isGlutenFree),
        preparationNotes: m.preparationNotes || undefined,
        displayOrder: Number(m.displayOrder || 0)
      };
      await db.collection(COLLECTIONS.MENU_ITEMS).updateOne(
        { id: itemDoc.id },
        { $set: itemDoc },
        { upsert: true }
      );
      itemCount++;
    }
    console.log(`[PASS] Migrated ${itemCount} menu items.`);

    // 9. Migrate Reservations
    console.log('\n--- Step 8: Migrating Reservations ---');
    let reservationsToMigrate: any[] = [];
    if (sqliteDb) {
      try {
        reservationsToMigrate = sqliteDb.prepare('SELECT * FROM reservations').all();
      } catch {
        reservationsToMigrate = [...INITIAL_RESERVATIONS];
      }
    } else {
      reservationsToMigrate = [...INITIAL_RESERVATIONS];
    }

    let resCount = 0;
    for (const res of reservationsToMigrate) {
      let items = res.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch { items = []; }
      }
      let assignedSeatNumbers = res.assignedSeatNumbers;
      if (typeof assignedSeatNumbers === 'string') {
        try { assignedSeatNumbers = JSON.parse(assignedSeatNumbers); } catch { assignedSeatNumbers = undefined; }
      }

      const resDoc = {
        _id: res.id,
        id: res.id,
        bookingReference: res.bookingReference,
        restaurantId: res.restaurantId,
        restaurantName: res.restaurantName || undefined,
        restaurantSlug: res.restaurantSlug || undefined,
        customerId: res.customerId,
        customerName: res.customerName,
        customerEmail: res.customerEmail,
        customerPhone: res.customerPhone,
        partySize: Number(res.partySize),
        reservationDate: res.reservationDate,
        startTime: res.startTime,
        endTime: res.endTime,
        status: res.status,
        assignedTableId: res.assignedTableId || undefined,
        assignedTableName: res.assignedTableName || undefined,
        assignedSeatNumbers: Array.isArray(assignedSeatNumbers) ? assignedSeatNumbers : undefined,
        specialRequests: res.specialRequests || undefined,
        orderSubtotal: Number(res.orderSubtotal || 0),
        orderTax: Number(res.orderTax || 0),
        estimatedTotal: Number(res.estimatedTotal || 0),
        items: Array.isArray(items) ? items : [],
        cancellationReason: res.cancellationReason || undefined,
        cancelledAt: res.cancelledAt || undefined,
        createdAt: res.createdAt,
        updatedAt: res.updatedAt
      };

      await db.collection(COLLECTIONS.RESERVATIONS).updateOne(
        { id: resDoc.id },
        { $set: resDoc },
        { upsert: true }
      );
      resCount++;
    }
    console.log(`[PASS] Migrated ${resCount} reservations.`);

    // 10. Migrate Reviews
    console.log('\n--- Step 9: Migrating Reviews ---');
    let reviewsToMigrate: any[] = [];
    if (sqliteDb) {
      try {
        reviewsToMigrate = sqliteDb.prepare('SELECT * FROM reviews').all();
      } catch {
        reviewsToMigrate = [...INITIAL_REVIEWS];
      }
    } else {
      reviewsToMigrate = [...INITIAL_REVIEWS];
    }

    let reviewCount = 0;
    for (const rev of reviewsToMigrate) {
      let tags = rev.tags;
      if (typeof tags === 'string') {
        try { tags = JSON.parse(tags); } catch { tags = undefined; }
      }

      const revDoc = {
        _id: rev.id,
        id: rev.id,
        restaurantId: rev.restaurantId,
        customerId: rev.customerId,
        customerName: rev.customerName,
        customerEmail: rev.customerEmail || undefined,
        reservationId: rev.reservationId,
        overallRating: Number(rev.overallRating),
        foodRating: rev.foodRating ? Number(rev.foodRating) : undefined,
        serviceRating: rev.serviceRating ? Number(rev.serviceRating) : undefined,
        ambienceRating: rev.ambienceRating ? Number(rev.ambienceRating) : undefined,
        valueRating: rev.valueRating ? Number(rev.valueRating) : undefined,
        comment: rev.comment || undefined,
        tags: Array.isArray(tags) ? tags : undefined,
        ownerResponse: rev.ownerResponse || undefined,
        ownerRespondedAt: rev.ownerRespondedAt || undefined,
        isReported: Boolean(rev.isReported),
        reportReason: rev.reportReason || undefined,
        reportedAt: rev.reportedAt || undefined,
        createdAt: rev.createdAt,
        updatedAt: rev.updatedAt
      };

      await db.collection(COLLECTIONS.REVIEWS).updateOne(
        { id: revDoc.id },
        { $set: revDoc },
        { upsert: true }
      );
      reviewCount++;
    }
    console.log(`[PASS] Migrated ${reviewCount} customer reviews.`);

    // Print summary verification
    console.log('\n========================================================');
    console.log('MIGRATION VERIFICATION AUDIT');
    console.log('========================================================');
    for (const [key, collName] of Object.entries(COLLECTIONS)) {
      const count = await db.collection(collName).countDocuments();
      console.log(`- Collection "${collName}" (${key}): ${count} documents`);
    }
    console.log('\n[SUCCESS] SQLite to MongoDB Atlas migration completed safely!');
    console.log('Original SQLite database remains untouched.\n');

  } catch (err: any) {
    console.error('[ERROR] Migration failed:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

runMigration();

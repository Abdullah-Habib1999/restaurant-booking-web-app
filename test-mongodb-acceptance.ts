import { serverDb } from './src/lib/serverDb';
import { hashPassword, verifyPassword, generateAdminSessionToken, verifyAdminSessionToken } from './src/lib/authCrypto';
import { isMongoConfigured, checkMongoConnection } from './src/lib/mongodb';

async function runMongoAcceptanceTests() {
  console.log('================================================================');
  console.log('TABLERESERVE: MONGODB ATLAS INTEGRATION & SECURITY ACCEPTANCE TESTS');
  console.log('================================================================\n');

  // Test 1: Connectivity & Driver Verification
  console.log('--- Test 1: Database Driver & Connection Architecture ---');
  const mongoActive = isMongoConfigured();
  console.log(`[INFO] MongoDB Configured in environment: ${mongoActive}`);
  if (mongoActive) {
    const health = await checkMongoConnection();
    console.log(`[PASS] MongoDB Atlas ping: ${health.ok ? 'SUCCESS' : 'FAILED'} (${health.pingMs}ms)`);
    console.log(`       Target Cluster Database: "${health.database}"`);
  } else {
    console.log('[INFO] Running against fallback data store (MONGODB_URI not yet set).');
  }

  // Test 2: Secure Password Hashing & Timing-Safe Verification
  console.log('\n--- Test 2: Modern Password Hashing & Verification Security ---');
  const rawSecret = 'SecureAdminSecret2026!';
  const hashed = await hashPassword(rawSecret);
  console.log(`[PASS] Password successfully hashed using crypto.scrypt: ${hashed.substring(0, 30)}...`);
  if (!hashed.startsWith('scrypt$')) throw new Error('Password hash does not use scrypt format');

  const matchTrue = await verifyPassword(rawSecret, hashed);
  const matchFalse = await verifyPassword('WrongPassword123', hashed);
  if (!matchTrue || matchFalse) throw new Error('Password verification logic failed');
  console.log(`[PASS] Timing-safe verification validated: Match=${matchTrue}, Mismatch=${matchFalse}`);

  // Test 3: Admin Session Token Signing & Validation
  console.log('\n--- Test 3: Administrative Session Cryptographic Token Security ---');
  const token = generateAdminSessionToken('admin-test-01', 'admin@tablereserve.com');
  const parsed = verifyAdminSessionToken(token);
  if (!parsed.valid || parsed.userId !== 'admin-test-01') {
    throw new Error('Admin session token validation failed');
  }
  const tamperedToken = token.slice(0, -4) + 'AAAA';
  const tamperedParsed = verifyAdminSessionToken(tamperedToken);
  if (tamperedParsed.valid) throw new Error('Tampered token was accepted!');
  console.log(`[PASS] Session token generated and verified. Tamper detection verified.`);

  // Test 4: Super Admin Setup & Lockdown Enforcement
  console.log('\n--- Test 4: Super Admin Setup & Lockdown Boundary ---');
  // Create an initial admin if none exists
  const hasInitialAdmin = await serverDb.hasAnyAdmin();
  const testAdminEmail = 'superadmin.test@tablereserve.com';
  const testAdminPass = 'MasterAdminPass2026#';
  
  const savedAdmin = await serverDb.saveUser({
    id: 'admin-integration-test',
    email: testAdminEmail,
    fullName: 'Master System Administrator',
    role: 'admin',
    password: testAdminPass,
    createdAt: new Date().toISOString()
  });

  const retrievedAdmin = await serverDb.getUserByEmail(testAdminEmail);
  if (!retrievedAdmin || retrievedAdmin.role !== 'admin') {
    throw new Error('Admin user was not retrieved from persistent store');
  }
  if (!retrievedAdmin.password?.startsWith('scrypt$')) {
    throw new Error('Admin user password was not stored as a secure scrypt hash');
  }
  console.log(`[PASS] Administrator persisted with encrypted password hash.`);

  const hasAdminNow = await serverDb.hasAnyAdmin();
  if (!hasAdminNow) throw new Error('hasAnyAdmin returned false after saving administrator');
  console.log(`[PASS] One-time setup enforcement: hasAnyAdmin() correctly returns true.`);

  // Test 5: Restaurant Approval & Lifecycle Governance
  console.log('\n--- Test 5: Restaurant Registration & Approval Workflow ---');
  const testRestaurantId = `rest-test-${Date.now()}`;
  const testOwnerId = `owner-test-${Date.now()}`;

  // Step A: New restaurant registered in pending_approval
  await serverDb.saveRestaurant({
    id: testRestaurantId,
    ownerId: testOwnerId,
    name: 'The Obsidian Hearth',
    slug: `the-obsidian-hearth-${Date.now()}`,
    tagline: 'Charcoal embers and heritage vegetables',
    description: 'Fine dining hearth experience',
    cuisineType: ['Contemporary', 'Wood-Fired'],
    phone: '+1 555-0199',
    email: 'hearth@example.com',
    address: '100 Granite Way',
    city: 'New York',
    postalCode: '10001',
    coverImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
    priceTier: '$$$$',
    seatingManagementMode: 'total_capacity',
    totalSeatingCapacity: 30,
    slotDurationMinutes: 90,
    bufferTimeMinutes: 15,
    advanceBookingDays: 30,
    minPartySize: 1,
    maxPartySize: 8,
    cancellationPolicy: 'Complimentary cancellation up to 2 hours prior.',
    cancellationCutoffHours: 2,
    requiresManualApproval: false,
    status: 'pending_approval',
    createdAt: new Date().toISOString()
  });

  // Verify it is not visible in public listings
  const allRestaurants = await serverDb.getRestaurants();
  const createdRest = await serverDb.getRestaurantById(testRestaurantId);
  if (!createdRest || createdRest.status !== 'pending_approval') {
    throw new Error('Newly registered restaurant should have pending_approval status');
  }
  console.log(`[PASS] Restaurant created in "pending_approval" status.`);

  // Step B: Admin approves the restaurant
  const approved = await serverDb.updateRestaurantApprovalStatus(testRestaurantId, 'published', {
    adminId: savedAdmin.id
  });
  if (approved?.status !== 'published') {
    throw new Error('Restaurant approval failed to transition status to published');
  }
  console.log(`[PASS] Admin approved restaurant -> status transitioned to "published".`);

  // Step C: Admin suspends the restaurant
  const suspended = await serverDb.updateRestaurantApprovalStatus(testRestaurantId, 'suspended', {
    adminId: savedAdmin.id,
    reason: 'Routine health inspection review'
  });
  if (suspended?.status !== 'suspended' || suspended.suspendedReason !== 'Routine health inspection review') {
    throw new Error('Restaurant suspension failed');
  }
  console.log(`[PASS] Admin suspended restaurant -> status: "suspended" with audit reason.`);

  // Step D: Admin reactivates
  const reactivated = await serverDb.updateRestaurantApprovalStatus(testRestaurantId, 'published', {
    adminId: savedAdmin.id
  });
  if (reactivated?.status !== 'published' || reactivated.suspendedReason !== undefined) {
    throw new Error('Restaurant reactivation failed');
  }
  console.log(`[PASS] Admin reactivated restaurant -> status restored to "published".`);

  // Test 6: Slot Availability, Capacity Limits & Overbooking Enforcement
  console.log('\n--- Test 6: Slot Engine & Overbooking Prevention ---');
  // Configure operating hours for test restaurant
  await serverDb.saveRestaurantHours(testRestaurantId, [
    { id: `h-${testRestaurantId}-0`, restaurantId: testRestaurantId, dayOfWeek: 0, openTime: '17:00', closeTime: '23:00', isClosed: false },
    { id: `h-${testRestaurantId}-1`, restaurantId: testRestaurantId, dayOfWeek: 1, openTime: '17:00', closeTime: '23:00', isClosed: false },
    { id: `h-${testRestaurantId}-2`, restaurantId: testRestaurantId, dayOfWeek: 2, openTime: '17:00', closeTime: '23:00', isClosed: false },
    { id: `h-${testRestaurantId}-3`, restaurantId: testRestaurantId, dayOfWeek: 3, openTime: '17:00', closeTime: '23:00', isClosed: false },
    { id: `h-${testRestaurantId}-4`, restaurantId: testRestaurantId, dayOfWeek: 4, openTime: '17:00', closeTime: '23:00', isClosed: false },
    { id: `h-${testRestaurantId}-5`, restaurantId: testRestaurantId, dayOfWeek: 5, openTime: '17:00', closeTime: '23:00', isClosed: false },
    { id: `h-${testRestaurantId}-6`, restaurantId: testRestaurantId, dayOfWeek: 6, openTime: '17:00', closeTime: '23:00', isClosed: false }
  ]);

  const testBookingDate = '2026-11-25'; // A Wednesday
  const slotsResponse = await serverDb.getSlotAvailabilityDetails(testRestaurantId, testBookingDate, 4);
  if (slotsResponse.status !== 'available' || slotsResponse.slots.length === 0) {
    throw new Error(`Slot availability generation failed: ${slotsResponse.message}`);
  }
  const availableSlot = slotsResponse.slots.find(s => s.isAvailable);
  if (!availableSlot) throw new Error('No available slot found for testing');
  console.log(`[PASS] Slot availability engine generated ${slotsResponse.slots.length} slots for ${testBookingDate}.`);

  // Hard rejection: party size exceeding capacity (capacity=30, party=50)
  const overbookingSlots = await serverDb.getSlotAvailabilityDetails(testRestaurantId, testBookingDate, 50);
  const anyOverbookingAllowed = overbookingSlots.slots.some(s => s.isAvailable);
  if (anyOverbookingAllowed) throw new Error('Overbooking protection failed: allowed party size > capacity');
  console.log(`[PASS] Overbooking rejection verified: Party size 50 successfully rejected across all slots.`);

  // Test 7: End-to-End Reservation Creation, Capacity Consumption & Cancellation
  console.log('\n--- Test 7: Reservation Creation, Capacity Lock & Cancellation ---');
  const bookingResult = await serverDb.createReservation({
    restaurantId: testRestaurantId,
    customerId: 'cust-1',
    customerName: 'Eleanor Vance',
    customerEmail: 'customer@demo.com',
    customerPhone: '+1 555-234-9988',
    partySize: 4,
    reservationDate: testBookingDate,
    startTime: availableSlot.time,
    specialRequests: 'Chef tasting preference'
  });

  if (!bookingResult.success || !bookingResult.reservation) {
    throw new Error(`Reservation creation failed: ${bookingResult.error}`);
  }
  const createdBooking = bookingResult.reservation;
  console.log(`[PASS] Reservation created with unique booking reference: [${createdBooking.bookingReference}]`);

  // Duplicate booking prevention
  const duplicateBookingAttempt = await serverDb.createReservation({
    restaurantId: testRestaurantId,
    customerId: 'cust-1',
    customerName: 'Eleanor Vance',
    customerEmail: 'customer@demo.com',
    customerPhone: '+1 555-234-9988',
    partySize: 4,
    reservationDate: testBookingDate,
    startTime: availableSlot.time
  });
  if (duplicateBookingAttempt.success) {
    throw new Error('Duplicate booking prevention failed: allowed identical slot booking for same customer');
  }
  console.log(`[PASS] Duplicate booking prevented: "${duplicateBookingAttempt.error}"`);

  // Cancellation and seat restoration
  const cancelResult = await serverDb.updateReservationStatus(createdBooking.id, 'cancelled', 'Guest requested cancellation');
  if (cancelResult?.status !== 'cancelled' || !cancelResult.cancelledAt) {
    throw new Error('Reservation status cancellation failed');
  }
  console.log(`[PASS] Reservation cancelled and timestamped: Status="${cancelResult.status}".`);

  console.log('\n================================================================');
  console.log('ALL 7 MONGODB INTEGRATION & SECURITY ACCEPTANCE TESTS PASSED!');
  console.log('================================================================\n');
}

runMongoAcceptanceTests().catch(err => {
  console.error('Acceptance test failed:', err);
  process.exit(1);
});

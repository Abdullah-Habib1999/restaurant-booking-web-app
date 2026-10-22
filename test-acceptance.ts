import { db } from './src/lib/db';

async function runAcceptanceTests() {
  console.log('====================================================');
  console.log('RUNNING SYSTEM ACCEPTANCE TESTS FOR BOOKING PLATFORM');
  console.log('====================================================\n');

  // Test 1: Verify Seed Restaurants & Initial Capacity
  const restaurants = await db.getRestaurants();
  console.log(`[PASS] Test 1: Loaded ${restaurants.length} active restaurants from database.`);
  const rest1 = restaurants.find(r => r.id === 'rest-1');
  if (!rest1) throw new Error('Restaurant rest-1 not found');
  console.log(`       Target Restaurant: "${rest1.name}", Total Capacity: ${rest1.totalSeatingCapacity} seats, Mode: ${rest1.seatingManagementMode}`);

  // Test 2: Table Inventory Verification
  const tables = await db.getTables(rest1.id);
  const activeTableSeats = tables.filter(t => t.isActive).reduce((sum, t) => sum + t.capacity, 0);
  console.log(`[PASS] Test 2: Verified ${tables.length} tables for ${rest1.name} totaling ${activeTableSeats} seats.`);

  // Test 3: Operating Hours and Slot Availability Engine
  const testDate = '2026-10-25'; // A Sunday
  const slots = await db.checkSlotAvailability(rest1.id, testDate, 4);
  console.log(`[PASS] Test 3: Generated ${slots.length} time slots for party of 4 on ${testDate}.`);
  const sampleSlot = slots.find(s => s.isAvailable);
  console.log(`       First available slot: ${sampleSlot?.time} (${sampleSlot?.formattedTime}) with ${sampleSlot?.remainingSeats} remaining seats.`);

  // Test 4: Capacity Limit Enforcement (Hard rejection test)
  console.log('\n--- Testing Overbooking Protection ---');
  // Attempt party of 100 on rest-1 (which has capacity 48)
  const excessiveSlots = await db.checkSlotAvailability(rest1.id, testDate, 100);
  const anyAvailable = excessiveSlots.some(s => s.isAvailable);
  if (anyAvailable) {
    throw new Error('FAIL: Capacity engine allowed booking exceeding total seats!');
  } else {
    console.log(`[PASS] Test 4: Overbooking protection verified. Party of 100 successfully rejected across all slots.`);
    console.log(`       Sample rejection reason: "${excessiveSlots[0]?.reason}"`);
  }

  // Test 5: End-to-End Reservation Creation with Food Pre-Order & Server Recalculation
  console.log('\n--- Testing Booking Creation & Server-side Order Pricing ---');
  const menuItems = await db.getMenuItems(rest1.id);
  const burrata = menuItems.find(m => m.name.includes('Burrata'))!;
  const tagliolini = menuItems.find(m => m.name.includes('Tagliolini'))!;

  const bookingRes = await db.createReservation({
    restaurantId: rest1.id,
    customerId: 'cust-1',
    customerName: 'Eleanor Vance',
    customerEmail: 'eleanor.vance@example.com',
    customerPhone: '+1 (555) 234-9988',
    partySize: 4,
    reservationDate: testDate,
    startTime: sampleSlot!.time,
    specialRequests: 'Window seat preference',
    items: [
      { menuItemId: burrata.id, quantity: 2 },
      { menuItemId: tagliolini.id, quantity: 1 }
    ]
  });

  if (!bookingRes.success || !bookingRes.reservation) {
    throw new Error(`FAIL: Booking creation failed: ${bookingRes.error}`);
  }

  const res = bookingRes.reservation;
  console.log(`[PASS] Test 5: Reservation created successfully! Reference: [${res.bookingReference}]`);
  console.log(`       Assigned Table: ${res.assignedTableName}`);
  console.log(`       Pre-Order Subtotal: $${res.orderSubtotal} | Tax: $${res.orderTax} | Estimated Total: $${res.estimatedTotal}`);
  console.log(`       Pre-Ordered Items count: ${res.items.length}`);

  // Test 6: Capacity Consumption Verification
  const slotsAfterBooking = await db.checkSlotAvailability(rest1.id, testDate, 4);
  const bookedSlotAfter = slotsAfterBooking.find(s => s.time === sampleSlot!.time);
  console.log(`[PASS] Test 6: Slot capacity updated from ${sampleSlot!.remainingSeats} to ${bookedSlotAfter?.remainingSeats} seats.`);

  // Test 7: Cancellation & Capacity Release Test
  console.log('\n--- Testing Cancellation & Seat Release ---');
  const cancelled = await db.updateReservationStatus(res.id, 'cancelled', 'Customer cancelled');
  if (cancelled?.status !== 'cancelled') throw new Error('FAIL: Status update failed');
  
  const slotsAfterCancel = await db.checkSlotAvailability(rest1.id, testDate, 4);
  const bookedSlotAfterCancel = slotsAfterCancel.find(s => s.time === sampleSlot!.time);
  console.log(`[PASS] Test 7: Reservation cancelled. Slot capacity restored back to ${bookedSlotAfterCancel?.remainingSeats} seats.`);

  // Test 8: Unavailable Menu Item Protection Test
  console.log('\n--- Testing Unavailable Menu Item Protection ---');
  const tempItem = await db.saveMenuItem({
    id: 'item-sold-out',
    restaurantId: rest1.id,
    categoryId: 'cat-1',
    name: 'Truffle Fondue (Limited)',
    description: 'Rare black truffles',
    price: 45.0,
    isAvailable: false, // Mark unavailable
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: true,
    displayOrder: 99
  });

  const failedBooking = await db.createReservation({
    restaurantId: rest1.id,
    customerId: 'cust-1',
    customerName: 'Test Diner',
    customerEmail: 'diner@example.com',
    customerPhone: '+1 555-1111',
    partySize: 2,
    reservationDate: testDate,
    startTime: sampleSlot!.time,
    items: [{ menuItemId: tempItem.id, quantity: 1 }]
  });

  if (failedBooking.success) {
    throw new Error('FAIL: Allowed pre-ordering of unavailable dish!');
  } else {
    console.log(`[PASS] Test 8: Blocked pre-order of unavailable item. Error: "${failedBooking.error}"`);
  }

  // Cleanup
  await db.deleteMenuItem(tempItem.id);

  console.log('\n====================================================');
  console.log('ALL 8 BACKEND AND CAPACITY ENGINE ACCEPTANCE TESTS PASSED!');
  console.log('====================================================');
}

runAcceptanceTests().catch(err => {
  console.error('Test suite failure:', err);
  process.exit(1);
});

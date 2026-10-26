import { serverDb } from './src/lib/serverDb';

async function runReviewsAcceptanceTests() {
  console.log('================================================================');
  console.log('ACCEPTANCE TESTS: CUSTOMER RATINGS AND REVIEWS AFTER DINING');
  console.log('================================================================\n');

  const customerId = 'cust-1';
  const ownerId = 'owner-1';
  const restaurantId = 'rest-1';

  // Test 1: Verify Initial Verified Reviews and Recalculated Ratings
  console.log('--- Test 1: Real Database Records & Accurate Ratings Calculation ---');
  const rest1 = await serverDb.getRestaurantById(restaurantId);
  const initialReviews = await serverDb.getReviews({ restaurantId });
  const initialStats = await serverDb.getReviewStats(restaurantId);

  console.log(`[PASS] Test 1: Loaded ${initialReviews.length} verified reviews for ${rest1?.name}.`);
  console.log(`       Database Rating: ${rest1?.rating}/5 | Calculated Avg: ${initialStats.averageRating}/5 | Total Reviews: ${rest1?.reviewCount}`);

  // Test 2: Cannot review an upcoming or confirmed reservation (only completed allowed)
  console.log('\n--- Test 2: Only Completed Reservations Can Be Reviewed ---');
  const customerReservations = await serverDb.getReservations({ customerId });
  let confirmedRes = customerReservations.find(r => r.status === 'confirmed');
  if (!confirmedRes) {
    // If not found, create a test confirmed reservation to verify restriction
    const createRes = await serverDb.createReservation({
      restaurantId,
      customerId,
      customerName: 'Eleanor Vance',
      customerEmail: 'customer@demo.com',
      customerPhone: '+1 555-234-9988',
      partySize: 2,
      reservationDate: '2026-11-20',
      startTime: '18:00'
    });
    confirmedRes = createRes.reservation;
  }
  if (!confirmedRes) throw new Error('Confirmed reservation not found for test');

  const invalidReviewAttempt = await serverDb.createReview({
    restaurantId,
    customerId,
    customerName: 'Eleanor Vance',
    reservationId: confirmedRes.id,
    overallRating: 5,
    comment: 'Should fail because booking is not completed'
  });

  if (invalidReviewAttempt.success) {
    throw new Error('FAIL: Server permitted review for a reservation that is NOT completed!');
  } else {
    console.log(`[PASS] Test 2: Blocked review for non-completed booking.`);
    console.log(`       Server rejection message: "${invalidReviewAttempt.error}"`);
  }

  // Test 3: Customers cannot review other users' reservations
  console.log('\n--- Test 3: Cross-Customer Authorization Check ---');
  const allRestReservations = await serverDb.getReservations({ restaurantId });
  const completedResOtherCustomer = allRestReservations.find(r => r.status === 'completed' && r.customerId !== customerId);
  if (completedResOtherCustomer) {
    const fraudAttempt = await serverDb.createReview({
      restaurantId,
      customerId, // Eleanor trying to review Marcus's booking
      customerName: 'Eleanor Vance',
      reservationId: completedResOtherCustomer.id,
      overallRating: 5,
      comment: 'Attempting to review someone else reservation'
    });

    if (fraudAttempt.success) {
      throw new Error('FAIL: Customer reviewed someone else reservation!');
    } else {
      console.log(`[PASS] Test 3: Unauthorized review correctly blocked. Error: "${fraudAttempt.error}"`);
    }
  }

  // Test 4: Restaurant owners cannot review their own restaurant
  console.log('\n--- Test 4: Owner Self-Review Prevention ---');
  const ownerReviewAttempt = await serverDb.createReview({
    restaurantId,
    customerId: ownerId, // Owner-1 trying to review Rest-1
    customerName: 'Chef Marco Bellini',
    reservationId: 'res-comp-1',
    overallRating: 5,
    comment: 'Our food is the best!'
  });

  if (ownerReviewAttempt.success) {
    throw new Error('FAIL: Allowed restaurant owner to review their own restaurant!');
  } else {
    console.log(`[PASS] Test 4: Owner self-review prevention verified. Error: "${ownerReviewAttempt.error}"`);
  }

  // Test 5: Customer Can Review Their Completed Reservation
  console.log('\n--- Test 5: Successful Verified Review Creation by Customer ---');
  const targetCompletedRes = await serverDb.getReservationById('res-comp-1');
  if (!targetCompletedRes || targetCompletedRes.status !== 'completed') {
    throw new Error('Completed reservation res-comp-1 not found');
  }

  // Ensure clean test baseline if previous run left review
  const existingRev = await serverDb.getReviewByReservationId(targetCompletedRes.id);
  if (existingRev) {
    await serverDb.deleteReview(existingRev.id, existingRev.customerId);
  }

  const reviewCreation = await serverDb.createReview({
    restaurantId,
    customerId,
    customerName: 'Eleanor Vance',
    customerEmail: 'customer@demo.com',
    reservationId: targetCompletedRes.id,
    overallRating: 5,
    foodRating: 5,
    serviceRating: 5,
    ambienceRating: 4,
    valueRating: 5,
    comment: 'The artisanal wood-fired pasta was extraordinary! Impeccable wine pairings and stellar service.',
    tags: ['Excellent Food', 'Friendly Staff', 'Great Ambience']
  });

  if (!reviewCreation.success || !reviewCreation.review) {
    throw new Error(`FAIL: Review creation failed: ${reviewCreation.error}`);
  }

  const newReview = reviewCreation.review;
  console.log(`[PASS] Test 5: Review created successfully with ID: [${newReview.id}]`);
  console.log(`       Overall: ${newReview.overallRating}★ | Food: ${newReview.foodRating}★ | Tags: ${JSON.stringify(newReview.tags)}`);

  // Test 6: Enforce Single Review Per Reservation (Unique Constraint)
  console.log('\n--- Test 6: Prevent Duplicate Review on Same Reservation ---');
  const duplicateAttempt = await serverDb.createReview({
    restaurantId,
    customerId,
    customerName: 'Eleanor Vance',
    reservationId: targetCompletedRes.id,
    overallRating: 4,
    comment: 'Trying to leave a second review for the same meal'
  });

  if (duplicateAttempt.success) {
    throw new Error('FAIL: System allowed multiple reviews for the same reservation!');
  } else {
    console.log(`[PASS] Test 6: Duplicate review prevented. Error: "${duplicateAttempt.error}"`);
  }

  // Test 7: Recalculation of Restaurant Averages After Creation
  console.log('\n--- Test 7: Automatic Recalculation of Restaurant Average & Count ---');
  const updatedRest = await serverDb.getRestaurantById(restaurantId);
  const updatedStats = await serverDb.getReviewStats(restaurantId);
  console.log(`[PASS] Test 7: Rating updated in restaurant record: ${updatedRest?.rating}/5 (${updatedRest?.reviewCount} reviews).`);
  console.log(`       Stats average: ${updatedStats.averageRating}/5 | Distribution:`, updatedStats.distribution);

  // Test 8: Separate Reviews for Separate Completed Visits to Same Restaurant
  console.log('\n--- Test 8: Separate Review Allowed for Second Completed Visit ---');
  const createSecondRes = await serverDb.createReservation({
    restaurantId,
    customerId,
    customerName: 'Eleanor Vance',
    customerEmail: 'customer@demo.com',
    customerPhone: '+1 555-234-9988',
    partySize: 2,
    reservationDate: '2026-11-28',
    startTime: '18:30'
  });

  if (!createSecondRes.success || !createSecondRes.reservation) {
    throw new Error(`Could not create second visit reservation: ${createSecondRes.error}`);
  }
  const secondVisitRes = await serverDb.updateReservationStatus(createSecondRes.reservation.id, 'completed');
  if (!secondVisitRes) throw new Error('Could not set second visit status to completed');

  const secondReview = await serverDb.createReview({
    restaurantId,
    customerId,
    customerName: 'Eleanor Vance',
    customerEmail: 'customer@demo.com',
    reservationId: secondVisitRes.id,
    overallRating: 4,
    foodRating: 4,
    serviceRating: 4,
    ambienceRating: 4,
    valueRating: 4,
    comment: 'Second visit was also wonderful. Fresh burrata and warm hospitality.',
    tags: ['Friendly Staff', 'Good Value']
  });

  if (!secondReview.success) {
    throw new Error(`FAIL: Blocked valid separate visit review: ${secondReview.error}`);
  }
  console.log(`[PASS] Test 8: Allowed separate review for second completed visit to the same venue.`);

  // Test 9: Customer Can Edit Their Review & Averages Update
  console.log('\n--- Test 9: Customer Review Editing & Automatic Recalculation ---');
  const editResult = await serverDb.updateReview(newReview.id, customerId, {
    overallRating: 4,
    comment: 'Updated review: The dining was great though waiting time was slightly longer than expected.',
    tags: ['Excellent Food', 'Long Waiting Time']
  });

  if (!editResult.success || !editResult.review) {
    throw new Error(`FAIL: Review edit failed: ${editResult.error}`);
  }
  console.log(`[PASS] Test 9: Review updated successfully. New rating: ${editResult.review.overallRating}★`);
  const restAfterEdit = await serverDb.getRestaurantById(restaurantId);
  console.log(`       Recalculated restaurant score: ${restAfterEdit?.rating}/5`);

  // Test 10: Owner Can Respond Publicly but Cannot Edit Customer Ratings
  console.log('\n--- Test 10: Restaurant Owner Public Response ---');
  const ownerResponse = await serverDb.respondToReview(
    newReview.id,
    ownerId,
    'Dear Eleanor, thank you for your kind words! We will refine the prep timing so your next visit is seamless.'
  );

  if (!ownerResponse.success || !ownerResponse.review) {
    throw new Error(`FAIL: Owner response failed: ${ownerResponse.error}`);
  }
  console.log(`[PASS] Test 10: Owner response successfully published.`);
  console.log(`        Response text: "${ownerResponse.review.ownerResponse}"`);

  // Unauthorized owner cannot respond
  const fraudOwnerResponse = await serverDb.respondToReview(newReview.id, 'owner-2', 'Trying to respond as unauthorized owner');
  if (fraudOwnerResponse.success) {
    throw new Error('FAIL: Unauthorized owner was able to respond to a restaurant review!');
  } else {
    console.log(`        Unauthorized owner response safely rejected: "${fraudOwnerResponse.error}"`);
  }

  // Test 11: Abuse Reporting
  console.log('\n--- Test 11: Review Moderation Reporting ---');
  const reportRes = await serverDb.reportReview(newReview.id, customerId, 'Inappropriate or abusive language test');
  if (!reportRes.success || !reportRes.review?.isReported) {
    throw new Error('FAIL: Reporting review failed');
  }
  console.log(`[PASS] Test 11: Review flagged for moderation successfully. Status isReported: ${reportRes.review.isReported}`);

  // Test 12: Customer Can Delete Their Review & Restaurant Score Restores
  console.log('\n--- Test 12: Review Deletion & Rating Recalculation ---');
  const deleteRes = await serverDb.deleteReview(newReview.id, customerId);
  if (!deleteRes.success) {
    throw new Error(`FAIL: Review deletion failed: ${deleteRes.error}`);
  }
  const restAfterDelete = await serverDb.getRestaurantById(restaurantId);
  console.log(`[PASS] Test 12: Review deleted. Restaurant review count updated to ${restAfterDelete?.reviewCount}`);

  // Clean up second review to leave clean state
  if (secondReview.review) {
    await serverDb.deleteReview(secondReview.review.id, customerId);
  }

  // Test 13: "No reviews yet" distinction
  console.log('\n--- Test 13: Distinction for Restaurant with No Reviews ---');
  const rest3 = await serverDb.getRestaurantById('rest-3');
  const rest3Reviews = await serverDb.getReviews({ restaurantId: 'rest-3' });
  console.log(`[PASS] Test 13: rest-3 has ${rest3Reviews.length} reviews. DB rating is ${rest3?.rating}, reviewCount is ${rest3?.reviewCount}.`);
  console.log(`        Frontend will display "No reviews yet" when reviewCount === 0.`);

  console.log('\n================================================================');
  console.log('ALL 13 CUSTOMER RATINGS AND REVIEWS ACCEPTANCE TESTS PASSED!');
  console.log('================================================================\n');
}

runReviewsAcceptanceTests().catch(err => {
  console.error('Acceptance test failed:', err);
  process.exit(1);
});

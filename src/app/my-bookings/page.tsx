'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Utensils, 
  FileText,
  ChevronRight,
  Info,
  Star,
  Edit3,
  Trash2
} from 'lucide-react';
import { db } from '@/lib/db';
import { Reservation, ReservationStatus, Review } from '@/types';
import { useAuth } from '@/context/AuthContext';
import ReviewModal from '@/components/ReviewModal';

export default function MyBookingsPage() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reviewsMap, setReviewsMap] = useState<{ [reservationId: string]: Review }>({});
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Reservation | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [targetReservationForReview, setTargetReservationForReview] = useState<Reservation | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  const fetchBookingsAndReviews = async () => {
    setLoading(true);
    const customerId = user?.id || 'cust-1';
    const [allRes, allRevs] = await Promise.all([
      db.getReservations({ customerId }),
      db.getReviews({ customerId })
    ]);
    setReservations(allRes);

    const map: { [reservationId: string]: Review } = {};
    for (const rev of allRevs) {
      map[rev.reservationId] = rev;
    }
    setReviewsMap(map);
    setLoading(false);
  };

  useEffect(() => {
    fetchBookingsAndReviews();
  }, [user]);

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this dining review?')) return;
    const customerId = user?.id || 'cust-1';
    setDeletingReviewId(reviewId);
    const res = await db.deleteReview(reviewId, customerId);
    setDeletingReviewId(null);
    if (res.success) {
      setActionMessage({ text: 'Your review was deleted successfully.', type: 'success' });
      fetchBookingsAndReviews();
    } else {
      setActionMessage({ text: res.error || 'Failed to delete review.', type: 'error' });
    }
  };

  const handleOpenReviewModal = (res: Reservation) => {
    setTargetReservationForReview(res);
    setReviewModalOpen(true);
  };

  const handleCancelBooking = async (res: Reservation) => {
    const updated = await db.updateReservationStatus(
      res.id, 
      'cancelled', 
      cancelReason || 'Cancelled by guest via customer portal.'
    );
    if (updated) {
      setActionMessage({ text: `Reservation ${res.bookingReference} has been cancelled. Allocated capacity released.`, type: 'success' });
      setCancellingId(null);
      setCancelReason('');
      fetchBookingsAndReviews();
    } else {
      setActionMessage({ text: 'Unable to cancel reservation.', type: 'error' });
    }
  };

  const getStatusBadge = (status: ReservationStatus) => {
    switch (status) {
      case 'confirmed':
        return <span className="px-2.5 py-1 rounded-full bg-[#132A1C] text-[#86EFAC] text-xs font-semibold flex items-center gap-1 border border-[#165B33]"><CheckCircle2 className="w-3.5 h-3.5" /> Confirmed</span>;
      case 'pending':
        return <span className="px-2.5 py-1 rounded-full bg-[#291F11] text-[#FDE68A] text-xs font-semibold flex items-center gap-1 border border-[#5E4018]"><Clock className="w-3.5 h-3.5" /> Pending Approval</span>;
      case 'checked_in':
        return <span className="px-2.5 py-1 rounded-full bg-[#152338] text-[#93C5FD] text-xs font-semibold flex items-center gap-1 border border-[#1E3A8A]"><Users className="w-3.5 h-3.5" /> Checked In</span>;
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full bg-[#1C1917] text-[#B7AAA0] text-xs font-semibold flex items-center gap-1 border border-[#332A25]"><CheckCircle2 className="w-3.5 h-3.5" /> Completed</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 rounded-full bg-[#2E1212] text-[#FCA5A5] text-xs font-semibold flex items-center gap-1 border border-[#5E1E1E]"><XCircle className="w-3.5 h-3.5" /> Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full bg-[#1C1917] text-[#B7AAA0] text-xs font-medium border border-[#332A25]">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      <div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#F5F0E9]">
          My Reservations & Orders
        </h1>
        <p className="text-sm text-[#B7AAA0] mt-1">
          Review upcoming dining reservations, view pre-ordered items, or manage your bookings.
        </p>
      </div>

      {actionMessage && (
        <div className={`p-4 rounded-xl text-sm border flex items-center justify-between ${
          actionMessage.type === 'success' 
            ? 'bg-[#132A1C] border-[#165B33] text-[#86EFAC]' 
            : 'bg-[#2E1212] border-[#5E1E1E] text-[#FCA5A5]'
        }`}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="text-xs font-bold underline cursor-pointer text-[#F5F0E9]">
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-[#8D8178]">Loading your reservations...</div>
      ) : reservations.length === 0 ? (
        <div className="bg-[#181513] rounded-3xl border border-[#332A25] p-12 text-center max-w-xl mx-auto shadow-2xl">
          <CalendarIcon className="w-12 h-12 text-[#C6A47E]/40 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-[#F5F0E9]">No bookings found</h3>
          <p className="text-sm text-[#B7AAA0] mt-1">
            You do not have any active or past restaurant reservations.
          </p>
          <Link
            href="/restaurants"
            className="mt-6 inline-block px-5 py-2.5 rounded-xl bg-[#8B5E45] hover:bg-[#9E6C51] text-[#F5F0E9] text-sm font-semibold transition shadow-md"
          >
            Explore Restaurants
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Booking Cards (Left 7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {reservations.map(res => (
              <div
                key={res.id}
                className={`bg-[#181513] rounded-2xl border p-5 transition-all duration-200 shadow-md hover:shadow-xl cursor-pointer ${
                  selectedBooking?.id === res.id 
                    ? 'border-[#8B5E45] ring-1 ring-[#8B5E45] bg-[#1C1917]' 
                    : 'border-[#332A25] hover:border-[#54372D]'
                }`}
                onClick={() => setSelectedBooking(res)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#332A25] pb-3">
                  <div>
                    <span className="text-[11px] font-mono text-[#C6A47E] font-bold">
                      Ref: {res.bookingReference}
                    </span>
                    <h3 className="font-serif text-lg font-bold text-[#F5F0E9]">
                      {res.restaurantName}
                    </h3>
                  </div>
                  <div>
                    {getStatusBadge(res.status)}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-3 text-xs text-[#B7AAA0]">
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-[#C6A47E]" />
                    <span>{res.reservationDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#C6A47E]" />
                    <span>{res.startTime} - {res.endTime}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#C6A47E]" />
                    <span>{res.partySize} {res.partySize === 1 ? 'Guest' : 'Guests'}</span>
                  </div>
                </div>

                {/* Pre-order overview & Total */}
                <div className="pt-3 border-t border-[#332A25] flex items-center justify-between text-xs">
                  <div className="text-[#8D8178] flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5 text-[#C6A47E]" />
                    <span>{res.items?.length || 0} pre-ordered items</span>
                  </div>
                  <div>
                    <span className="text-[#8D8178]">Est. Total: </span>
                    <strong className="text-sm text-[#C6A47E]">${res.estimatedTotal.toFixed(2)}</strong>
                  </div>
                </div>

                {/* Dining Review Status & Actions for Completed Visits */}
                {res.status === 'completed' && (
                  <div className="mt-3 pt-3 border-t border-[#332A25] flex flex-wrap items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                    {reviewsMap[res.id] ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#291F11] border border-[#5E4018] text-[#FDE68A] text-xs font-semibold">
                          <Star className="w-3 h-3 text-[#C6A47E] fill-[#C6A47E]" />
                          <span>Rated {reviewsMap[res.id].overallRating}/5</span>
                        </span>
                        <span className="text-[11px] text-[#86EFAC] font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Reviewed
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#C6A47E] font-medium">
                        Completed visit · Awaiting your feedback
                      </span>
                    )}

                    <div className="flex items-center gap-2 ml-auto">
                      {reviewsMap[res.id] ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenReviewModal(res)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#151311] hover:bg-[#38251F] text-[#F5F0E9] text-xs font-semibold border border-[#332A25] transition cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3 text-[#C6A47E]" />
                            Edit Review
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(reviewsMap[res.id].id)}
                            disabled={deletingReviewId === reviewsMap[res.id].id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2E1212] hover:bg-[#4A201D] text-rose-300 text-xs font-medium transition cursor-pointer border border-[#5E1E1E]"
                            title="Delete review"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenReviewModal(res)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8B5E45] hover:bg-[#9E6C51] text-[#F5F0E9] text-xs font-semibold shadow-md transition cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5 text-[#C6A47E] fill-[#C6A47E]" />
                          Rate Your Experience
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Inline cancellation prompt */}
                {cancellingId === res.id && (
                  <div className="mt-4 p-4 rounded-xl bg-[#2E1212] border border-[#5E1E1E] text-xs space-y-3" onClick={e => e.stopPropagation()}>
                    <p className="font-semibold text-rose-300">
                      Are you sure you want to cancel booking {res.bookingReference}?
                    </p>
                    <input
                      type="text"
                      placeholder="Optional cancellation reason..."
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#5E1E1E] bg-[#151311] text-[#F5F0E9] placeholder-[#8D8178] text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCancelBooking(res)}
                        className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-semibold cursor-pointer"
                      >
                        Confirm Cancellation
                      </button>
                      <button
                        onClick={() => setCancellingId(null)}
                        className="px-3 py-1.5 rounded-lg bg-[#151311] border border-[#332A25] text-[#B7AAA0] hover:text-[#F5F0E9] font-medium cursor-pointer"
                      >
                        Keep Booking
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Details Panel (Right 5 cols) */}
          <div className="lg:col-span-5 sticky top-24">
            {selectedBooking ? (
              <div className="bg-[#181513] rounded-3xl border border-[#332A25] p-6 shadow-2xl space-y-6">
                <div className="border-b border-[#332A25] pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-[#C6A47E]">
                      {selectedBooking.bookingReference}
                    </span>
                    {getStatusBadge(selectedBooking.status)}
                  </div>
                  <h3 className="font-serif text-xl font-bold text-[#F5F0E9] mt-1">
                    {selectedBooking.restaurantName}
                  </h3>
                  {selectedBooking.assignedTableName && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="inline-block text-xs font-semibold text-[#C6A47E] px-2.5 py-0.5 rounded-md bg-[#151311] border border-[#332A25]">
                        Table: {selectedBooking.assignedTableName}
                      </span>
                      {selectedBooking.assignedSeatNumbers && selectedBooking.assignedSeatNumbers.length > 0 && (
                        <span className="inline-block text-xs font-bold text-[#F5F0E9] px-2.5 py-0.5 rounded-md bg-[#8B5E45] border border-[#C6A47E]/30">
                          Seats: {selectedBooking.assignedSeatNumbers.map(s => `#${s}`).join(', ')}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Party and Time */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-[#332A25]/50">
                    <span className="text-[#8D8178]">Visit Date:</span>
                    <strong className="text-[#F5F0E9]">{selectedBooking.reservationDate}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#332A25]/50">
                    <span className="text-[#8D8178]">Scheduled Time:</span>
                    <strong className="text-[#F5F0E9]">{selectedBooking.startTime} - {selectedBooking.endTime}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#332A25]/50">
                    <span className="text-[#8D8178]">Party Size:</span>
                    <strong className="text-[#F5F0E9]">{selectedBooking.partySize} Guests</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#332A25]/50">
                    <span className="text-[#8D8178]">Guest Name:</span>
                    <strong className="text-[#F5F0E9]">{selectedBooking.customerName}</strong>
                  </div>
                  {selectedBooking.specialRequests && (
                    <div className="py-1">
                      <span className="text-[#8D8178] block mb-0.5">Special Requests:</span>
                      <p className="p-2.5 rounded-lg bg-[#151311] text-[#C6A47E] italic border border-[#332A25]">
                        "{selectedBooking.specialRequests}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Pre-ordered Food Items Breakdown */}
                <div className="border-t border-[#332A25] pt-4 space-y-3">
                  <h4 className="font-serif font-bold text-sm text-[#F5F0E9] flex items-center justify-between">
                    <span>Pre-Ordered Menu Items</span>
                    <span className="text-xs font-normal text-[#8D8178]">
                      {selectedBooking.items.length} dishes
                    </span>
                  </h4>

                  {selectedBooking.items.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedBooking.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs py-1.5 border-b border-[#332A25]/40">
                          <div>
                            <span className="font-medium text-[#F5F0E9]">{item.quantity}x {item.name}</span>
                            <span className="text-[10px] text-[#8D8178] block">@ ${item.price.toFixed(2)} each</span>
                          </div>
                          <span className="font-semibold text-[#C6A47E]">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#8D8178] italic">
                      No dishes were pre-ordered. Order at the table upon arrival.
                    </p>
                  )}

                  <div className="border-t border-[#332A25] pt-2 space-y-1 text-xs">
                    <div className="flex justify-between text-[#8D8178]">
                      <span>Subtotal:</span>
                      <span>${selectedBooking.orderSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[#8D8178]">
                      <span>Taxes & Fees:</span>
                      <span>${selectedBooking.orderTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-[#F5F0E9] pt-1">
                      <span>Estimated Bill:</span>
                      <span className="text-[#C6A47E]">${selectedBooking.estimatedTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Dining Review in Details Panel for Completed Bookings */}
                {selectedBooking.status === 'completed' && (
                  <div className="border-t border-[#332A25] pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif font-bold text-sm text-[#F5F0E9]">Dining Review</h4>
                      {reviewsMap[selectedBooking.id] ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#132A1C] text-[#86EFAC] border border-[#165B33]">
                          Verified Visit
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#C6A47E] font-medium">Not Reviewed Yet</span>
                      )}
                    </div>

                    {reviewsMap[selectedBooking.id] ? (
                      <div className="p-3.5 rounded-2xl bg-[#151311] border border-[#332A25] space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-[#C6A47E]">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star
                                key={star}
                                className={`w-3.5 h-3.5 ${
                                  reviewsMap[selectedBooking.id].overallRating >= star
                                    ? 'fill-[#C6A47E] text-[#C6A47E]'
                                    : 'text-[#332A25]'
                                }`}
                              />
                            ))}
                            <span className="ml-1 text-xs font-bold text-[#F5F0E9]">
                              {reviewsMap[selectedBooking.id].overallRating}.0/5
                            </span>
                          </div>
                          <span className="text-[10px] text-[#8D8178]">
                            {reviewsMap[selectedBooking.id].createdAt ? new Date(reviewsMap[selectedBooking.id].createdAt).toLocaleDateString() : ''}
                          </span>
                        </div>

                        {reviewsMap[selectedBooking.id].comment && (
                          <p className="text-[#B7AAA0] italic bg-[#1C1917] p-2.5 rounded-xl border border-[#332A25]">
                            "{reviewsMap[selectedBooking.id].comment}"
                          </p>
                        )}

                        {reviewsMap[selectedBooking.id].tags && reviewsMap[selectedBooking.id].tags!.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {reviewsMap[selectedBooking.id].tags!.map(tag => (
                              <span key={tag} className="px-2 py-0.5 rounded-md bg-[#1C1917] border border-[#332A25] text-[10px] text-[#C6A47E]">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {reviewsMap[selectedBooking.id].ownerResponse && (
                          <div className="mt-2 p-2.5 rounded-xl bg-[#291F11] border border-[#5E4018] text-[11px] text-[#FDE68A] space-y-1">
                            <span className="font-semibold text-[#F5F0E9] block">Owner Response:</span>
                            <p>{reviewsMap[selectedBooking.id].ownerResponse}</p>
                          </div>
                        )}

                        <div className="flex gap-2 pt-1 border-t border-[#332A25]">
                          <button
                            type="button"
                            onClick={() => handleOpenReviewModal(selectedBooking)}
                            className="flex-1 py-1.5 px-3 rounded-lg bg-[#181513] border border-[#332A25] hover:bg-[#38251F] text-xs font-semibold text-[#F5F0E9] transition cursor-pointer"
                          >
                            Edit Review
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(reviewsMap[selectedBooking.id].id)}
                            className="py-1.5 px-3 rounded-lg bg-[#2E1212] hover:bg-[#4A201D] text-xs font-medium text-rose-300 transition cursor-pointer border border-[#5E1E1E]"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenReviewModal(selectedBooking)}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#8B5E45] hover:bg-[#9E6C51] text-[#F5F0E9] text-xs font-semibold shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 text-[#C6A47E] fill-[#C6A47E]" />
                        Rate Your Experience
                      </button>
                    )}
                  </div>
                )}

                {/* Cancellation Actions */}
                {selectedBooking.status !== 'cancelled' && selectedBooking.status !== 'completed' && (
                  <div className="border-t border-[#332A25] pt-4">
                    <button
                      type="button"
                      onClick={() => setCancellingId(selectedBooking.id)}
                      className="w-full py-2 px-3 rounded-xl border border-[#5E1E1E] text-rose-300 hover:bg-[#2E1212] text-xs font-semibold transition cursor-pointer"
                    >
                      Cancel Reservation
                    </button>
                  </div>
                )}

              </div>
            ) : (
              <div className="bg-[#181513] rounded-3xl border border-[#332A25] p-8 text-center text-[#8D8178]">
                <FileText className="w-8 h-8 mx-auto mb-2 text-[#C6A47E]/40" />
                <p className="text-sm">Select a reservation to view complete details and pre-ordered dishes.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Review Dialog Modal */}
      {targetReservationForReview && (
        <ReviewModal
          reservation={targetReservationForReview}
          existingReview={reviewsMap[targetReservationForReview.id] || null}
          isOpen={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false);
            setTargetReservationForReview(null);
          }}
          onSuccess={() => {
            fetchBookingsAndReviews();
            setActionMessage({ text: 'Review recorded successfully. Restaurant ratings updated.', type: 'success' });
          }}
        />
      )}

    </div>
  );
}

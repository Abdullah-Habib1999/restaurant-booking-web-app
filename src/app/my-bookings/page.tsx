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
  Info
} from 'lucide-react';
import { db } from '@/lib/db';
import { Reservation, ReservationStatus } from '@/types';
import { useAuth } from '@/context/AuthContext';

export default function MyBookingsPage() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Reservation | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    // Fetch all bookings for this customer or default customer
    const customerId = user?.id || 'cust-1';
    const all = await db.getReservations({ customerId });
    setReservations(all);
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, [user]);

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
      fetchBookings();
    } else {
      setActionMessage({ text: 'Unable to cancel reservation.', type: 'error' });
    }
  };

  const getStatusBadge = (status: ReservationStatus) => {
    switch (status) {
      case 'confirmed':
        return <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Confirmed</span>;
      case 'pending':
        return <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Pending Approval</span>;
      case 'checked_in':
        return <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Checked In</span>;
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Completed</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      <div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1C1C1C]">
          My Reservations & Orders
        </h1>
        <p className="text-sm text-[#6B625D] mt-1">
          Review upcoming dining reservations, view pre-ordered items, or manage your bookings.
        </p>
      </div>

      {actionMessage && (
        <div className={`p-4 rounded-xl text-sm border flex items-center justify-between ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="text-xs font-bold underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-[#6B625D]">Loading your reservations...</div>
      ) : reservations.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#E8E1DA] p-12 text-center max-w-xl mx-auto">
          <CalendarIcon className="w-12 h-12 text-[#795548]/40 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-[#1C1C1C]">No bookings found</h3>
          <p className="text-sm text-[#6B625D] mt-1">
            You do not have any active or past restaurant reservations.
          </p>
          <Link
            href="/restaurants"
            className="mt-6 inline-block px-5 py-2.5 rounded-xl bg-[#4E342E] hover:bg-[#795548] text-white text-sm font-semibold transition"
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
                className={`bg-white rounded-2xl border p-5 transition-all shadow-xs hover:shadow-md cursor-pointer ${
                  selectedBooking?.id === res.id 
                    ? 'border-[#795548] ring-1 ring-[#795548]' 
                    : 'border-[#E8E1DA]'
                }`}
                onClick={() => setSelectedBooking(res)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E1DA]/60 pb-3">
                  <div>
                    <span className="text-[11px] font-mono text-[#795548] font-bold">
                      Ref: {res.bookingReference}
                    </span>
                    <h3 className="font-serif text-lg font-bold text-[#1C1C1C]">
                      {res.restaurantName}
                    </h3>
                  </div>
                  <div>
                    {getStatusBadge(res.status)}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-3 text-xs text-[#6B625D]">
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-[#795548]" />
                    <span>{res.reservationDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#795548]" />
                    <span>{res.startTime} - {res.endTime}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#795548]" />
                    <span>{res.partySize} {res.partySize === 1 ? 'Guest' : 'Guests'}</span>
                  </div>
                </div>

                {/* Pre-order overview & Total */}
                <div className="pt-3 border-t border-[#E8E1DA]/60 flex items-center justify-between text-xs">
                  <div className="text-[#6B625D] flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5 text-[#795548]" />
                    <span>{res.items?.length || 0} pre-ordered items</span>
                  </div>
                  <div>
                    <span className="text-[#6B625D]">Est. Total: </span>
                    <strong className="text-sm text-[#1C1C1C]">${res.estimatedTotal.toFixed(2)}</strong>
                  </div>
                </div>

                {/* Inline cancellation prompt */}
                {cancellingId === res.id && (
                  <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-xs space-y-3" onClick={e => e.stopPropagation()}>
                    <p className="font-semibold text-red-800">
                      Are you sure you want to cancel booking {res.bookingReference}?
                    </p>
                    <input
                      type="text"
                      placeholder="Optional cancellation reason..."
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-red-300 bg-white text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCancelBooking(res)}
                        className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold cursor-pointer"
                      >
                        Confirm Cancellation
                      </button>
                      <button
                        onClick={() => setCancellingId(null)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-700 font-medium cursor-pointer"
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
              <div className="bg-white rounded-3xl border border-[#E8E1DA] p-6 shadow-md space-y-6">
                <div className="border-b border-[#E8E1DA] pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-[#795548]">
                      {selectedBooking.bookingReference}
                    </span>
                    {getStatusBadge(selectedBooking.status)}
                  </div>
                  <h3 className="font-serif text-xl font-bold text-[#1C1C1C] mt-1">
                    {selectedBooking.restaurantName}
                  </h3>
                  {selectedBooking.assignedTableName && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="inline-block text-xs font-semibold text-[#4E342E] px-2.5 py-0.5 rounded-md bg-[#FAF9F6] border border-[#E8E1DA]">
                        Table: {selectedBooking.assignedTableName}
                      </span>
                      {selectedBooking.assignedSeatNumbers && selectedBooking.assignedSeatNumbers.length > 0 && (
                        <span className="inline-block text-xs font-bold text-[#795548] px-2.5 py-0.5 rounded-md bg-[#F4EBE1] border border-[#795548]/30">
                          Seats: {selectedBooking.assignedSeatNumbers.map(s => `#${s}`).join(', ')}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Party and Time */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-[#E8E1DA]/50">
                    <span className="text-[#6B625D]">Visit Date:</span>
                    <strong className="text-[#1C1C1C]">{selectedBooking.reservationDate}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E8E1DA]/50">
                    <span className="text-[#6B625D]">Scheduled Time:</span>
                    <strong className="text-[#1C1C1C]">{selectedBooking.startTime} - {selectedBooking.endTime}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E8E1DA]/50">
                    <span className="text-[#6B625D]">Party Size:</span>
                    <strong className="text-[#1C1C1C]">{selectedBooking.partySize} Guests</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E8E1DA]/50">
                    <span className="text-[#6B625D]">Guest Name:</span>
                    <strong className="text-[#1C1C1C]">{selectedBooking.customerName}</strong>
                  </div>
                  {selectedBooking.specialRequests && (
                    <div className="py-1">
                      <span className="text-[#6B625D] block mb-0.5">Special Requests:</span>
                      <p className="p-2 rounded-lg bg-[#FAF9F6] text-[#4E342E] italic">
                        "{selectedBooking.specialRequests}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Pre-ordered Food Items Breakdown */}
                <div className="border-t border-[#E8E1DA] pt-4 space-y-3">
                  <h4 className="font-serif font-bold text-sm text-[#1C1C1C] flex items-center justify-between">
                    <span>Pre-Ordered Menu Items</span>
                    <span className="text-xs font-normal text-[#6B625D]">
                      {selectedBooking.items.length} dishes
                    </span>
                  </h4>

                  {selectedBooking.items.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedBooking.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs py-1 border-b border-[#FAF9F6]">
                          <div>
                            <span className="font-medium text-[#1C1C1C]">{item.quantity}x {item.name}</span>
                            <span className="text-[10px] text-[#6B625D] block">@ ${item.price.toFixed(2)} each</span>
                          </div>
                          <span className="font-semibold text-[#1C1C1C]">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#6B625D] italic">
                      No dishes were pre-ordered. Order at the table upon arrival.
                    </p>
                  )}

                  <div className="border-t border-[#E8E1DA] pt-2 space-y-1 text-xs">
                    <div className="flex justify-between text-[#6B625D]">
                      <span>Subtotal:</span>
                      <span>${selectedBooking.orderSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[#6B625D]">
                      <span>Taxes & Fees:</span>
                      <span>${selectedBooking.orderTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-[#1C1C1C] pt-1">
                      <span>Estimated Bill:</span>
                      <span>${selectedBooking.estimatedTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Cancellation Actions */}
                {selectedBooking.status !== 'cancelled' && selectedBooking.status !== 'completed' && (
                  <div className="border-t border-[#E8E1DA] pt-4">
                    <button
                      type="button"
                      onClick={() => setCancellingId(selectedBooking.id)}
                      className="w-full py-2 px-3 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold transition cursor-pointer"
                    >
                      Cancel Reservation
                    </button>
                  </div>
                )}

              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-[#E8E1DA] p-8 text-center text-[#6B625D]">
                <FileText className="w-8 h-8 mx-auto mb-2 text-[#795548]/50" />
                <p className="text-sm">Select a reservation to view complete details and pre-ordered dishes.</p>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}

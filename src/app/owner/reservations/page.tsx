'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  Utensils, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Phone, 
  Mail,
  UserCheck,
  ChevronDown,
  Filter
} from 'lucide-react';
import { db } from '@/lib/db';
import { Reservation, ReservationStatus, DiningTable } from '@/types';

import { useAuth } from '@/context/AuthContext';

export default function OwnerReservationsPage() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Reservation | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    const targetId = user?.ownedRestaurantId || 'rest-1';
    const [resList, tabList] = await Promise.all([
      db.getReservations({ restaurantId: targetId }),
      db.getTables(targetId)
    ]);
    setReservations(resList);
    setTables(tabList);
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, [user]);

  const handleUpdateStatus = async (resId: string, newStatus: ReservationStatus) => {
    const updated = await db.updateReservationStatus(resId, newStatus);
    if (updated) {
      setActionNotice(`Reservation updated to ${newStatus.replace('_', ' ').toUpperCase()}`);
      setTimeout(() => setActionNotice(null), 3000);
      fetchBookings();
      if (selectedBooking?.id === resId) {
        setSelectedBooking(updated);
      }
    }
  };

  const handleAssignTable = async (resId: string, tableId: string) => {
    const updated = await db.assignReservationTable(resId, tableId);
    if (updated) {
      setActionNotice('Table assigned successfully');
      setTimeout(() => setActionNotice(null), 3000);
      fetchBookings();
      if (selectedBooking?.id === resId) {
        setSelectedBooking(updated);
      }
    }
  };

  // Filtered reservations
  const filtered = reservations.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.customerName.toLowerCase().includes(q);
      const matchRef = r.bookingReference.toLowerCase().includes(q);
      const matchPhone = r.customerPhone.toLowerCase().includes(q);
      return matchName || matchRef || matchPhone;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#F5F0E9]">
            Reservation & Pre-Order Console
          </h1>
          <p className="text-sm text-[#B7AAA0] mt-1">
            Table assignments, customer check-ins, and kitchen pre-order management.
          </p>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-[#132A1C] border border-[#22543D] text-xs text-[#86EFAC] font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#86EFAC]" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#181513] rounded-2xl border border-[#332A25] p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#8D8178] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer, phone, or reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-xl border border-[#332A25] bg-[#151311] text-xs text-[#F5F0E9] placeholder-[#8D8178] focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['all', 'confirmed', 'checked_in', 'pending', 'completed', 'cancelled'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#8B5E45] text-[#F5F0E9] shadow-sm'
                  : 'bg-[#151311] text-[#8D8178] hover:text-[#F5F0E9] border border-[#332A25]'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

      </div>

      {/* Main split view: Table List (7 cols) + Detail & Operations Panel (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Table of bookings */}
        <div className="lg:col-span-7 bg-[#181513] rounded-3xl border border-[#332A25] overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-xs text-[#8D8178]">Loading reservation ledger...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#8D8178]">No reservations match this filter.</div>
          ) : (
            <div className="divide-y divide-[#332A25]">
              {filtered.map(res => (
                <div
                  key={res.id}
                  onClick={() => setSelectedBooking(res)}
                  className={`p-4 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    selectedBooking?.id === res.id ? 'bg-[#1C1917] ring-1 ring-inset ring-[#8B5E45]' : 'hover:bg-[#1C1917]/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#C6A47E]">
                        {res.bookingReference}
                      </span>
                      <strong className="font-serif font-bold text-sm text-[#F5F0E9]">
                        {res.customerName}
                      </strong>
                      <span className="px-2 py-0.5 rounded-md bg-[#151311] border border-[#332A25] text-[10px] font-semibold text-[#C6A47E]">
                        {res.partySize} Guests
                      </span>
                    </div>

                    <div className="text-xs text-[#B7AAA0] mt-1 flex flex-wrap items-center gap-3">
                      <span>{res.reservationDate} at {res.startTime}</span>
                      <span>Table: <strong className="text-[#F5F0E9]">{res.assignedTableName || 'None'}</strong></span>
                      <span>Pre-Order: <strong className="text-[#F5F0E9]">${res.estimatedTotal.toFixed(2)}</strong></span>
                    </div>
                  </div>

                  <div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${
                      res.status === 'confirmed' ? 'bg-[#132A1C] text-[#86EFAC] border-[#22543D]' :
                      res.status === 'checked_in' ? 'bg-[#102A43] text-[#90CDF4] border-[#1E3A8A]' :
                      res.status === 'pending' ? 'bg-[#291F11] text-[#FDE68A] border-[#5E4018]' :
                      res.status === 'cancelled' ? 'bg-[#2E1212] text-[#FCA5A5] border-[#7F1D1D]' :
                      'bg-[#151311] text-[#B7AAA0] border-[#332A25]'
                    }`}>
                      {res.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Booking Operations Inspector */}
        <div className="lg:col-span-5 sticky top-24">
          {selectedBooking ? (
            <div className="bg-[#181513] rounded-3xl border border-[#332A25] p-6 shadow-xl space-y-6">
              
              <div className="border-b border-[#332A25] pb-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#C6A47E]">
                    Ref: {selectedBooking.bookingReference}
                  </span>
                  <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-[#151311] border border-[#332A25] text-[#C6A47E]">
                    {selectedBooking.status.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="font-serif text-xl font-bold text-[#F5F0E9] mt-1">
                  {selectedBooking.customerName}
                </h3>
                <div className="flex items-center gap-3 text-xs text-[#B7AAA0] mt-1">
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-[#8D8178]" /> {selectedBooking.customerPhone}</span>
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-[#8D8178]" /> {selectedBooking.customerEmail}</span>
                </div>
              </div>

              {/* Status Change Controls (Host Actions) */}
              <div className="space-y-2">
                <span className="block text-xs font-semibold uppercase tracking-wider text-[#8D8178]">
                  Update Arrival & Service Status
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'checked_in')}
                    className="p-2 rounded-xl bg-[#102A43] hover:bg-[#1E3A8A]/50 text-[#90CDF4] font-semibold border border-[#1E3A8A] transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Guest Arrived (Check In)
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'completed')}
                    className="p-2 rounded-xl bg-[#1C1917] hover:bg-[#38251F] text-[#F5F0E9] font-semibold border border-[#332A25] transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#86EFAC]" />
                    Completed & Billed
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'confirmed')}
                    className="p-2 rounded-xl bg-[#132A1C] hover:bg-[#22543D]/50 text-[#86EFAC] font-semibold border border-[#22543D] transition cursor-pointer"
                  >
                    Confirm Booking
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'cancelled')}
                    className="p-2 rounded-xl bg-[#2E1212] hover:bg-[#7F1D1D]/50 text-[#FCA5A5] font-semibold border border-[#7F1D1D] transition cursor-pointer"
                  >
                    Cancel & Free Capacity
                  </button>
                </div>
              </div>

              {/* Table Assignment */}
              <div className="space-y-2 border-t border-[#332A25] pt-4">
                <span className="block text-xs font-semibold uppercase tracking-wider text-[#8D8178]">
                  Assigned Table
                </span>
                <select
                  value={selectedBooking.assignedTableId || ''}
                  onChange={(e) => handleAssignTable(selectedBooking.id, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#332A25] bg-[#151311] text-xs font-semibold text-[#F5F0E9] focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
                >
                  <option value="">No Table Assigned</option>
                  {tables.map(tab => (
                    <option key={tab.id} value={tab.id} className="bg-[#151311] text-[#F5F0E9]">
                      {tab.tableNumber} - {tab.locationArea} ({tab.capacity} Seats)
                    </option>
                  ))}
                </select>
              </div>

              {/* Pre-Ordered Food Dishes (Kitchen Display) */}
              <div className="space-y-3 border-t border-[#332A25] pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-sm text-[#F5F0E9]">
                    Kitchen Pre-Order ({selectedBooking.items?.length || 0} items)
                  </h4>
                  <span className="text-xs font-bold text-[#C6A47E]">
                    ${selectedBooking.estimatedTotal.toFixed(2)}
                  </span>
                </div>

                {selectedBooking.items && selectedBooking.items.length > 0 ? (
                  <div className="divide-y divide-[#332A25] max-h-48 overflow-y-auto pr-1">
                    {selectedBooking.items.map((item, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-[#F5F0E9]">{item.quantity}x</span> <span className="text-[#B7AAA0]">{item.name}</span>
                        </div>
                        <span className="font-semibold text-[#C6A47E]">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#8D8178] italic">
                    Customer selected table-only; food to be ordered at the table.
                  </p>
                )}

                {selectedBooking.specialRequests && (
                  <div className="p-3 rounded-xl bg-[#151311] border border-[#332A25] text-xs text-[#B7AAA0]">
                    <span className="font-bold text-[#F5F0E9] block mb-0.5">Guest Notes:</span>
                    {selectedBooking.specialRequests}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-[#181513] rounded-3xl border border-[#332A25] p-8 text-center text-[#8D8178]">
              <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-[#8B5E45]" />
              <p className="text-sm">Click any reservation to inspect guest details, pre-orders, and change service status.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

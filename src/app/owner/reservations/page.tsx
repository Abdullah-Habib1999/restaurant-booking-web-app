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
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1C1C]">
            Reservation & Pre-Order Console
          </h1>
          <p className="text-sm text-[#6B625D] mt-1">
            Table assignments, customer check-ins, and kitchen pre-order management.
          </p>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-[#E8E1DA] p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#795548] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer, phone, or reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-xl border border-[#E8E1DA] bg-[#FAF9F6] text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#795548]/30"
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
                  ? 'bg-[#4E342E] text-white shadow-xs'
                  : 'bg-[#FAF9F6] text-[#6B625D] hover:text-[#1C1C1C]'
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
        <div className="lg:col-span-7 bg-white rounded-3xl border border-[#E8E1DA] overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-12 text-center text-xs text-[#6B625D]">Loading reservation ledger...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#6B625D]">No reservations match this filter.</div>
          ) : (
            <div className="divide-y divide-[#E8E1DA]/60">
              {filtered.map(res => (
                <div
                  key={res.id}
                  onClick={() => setSelectedBooking(res)}
                  className={`p-4 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    selectedBooking?.id === res.id ? 'bg-[#FAF9F6] ring-1 ring-inset ring-[#795548]' : 'hover:bg-[#FAF9F6]/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#4E342E]">
                        {res.bookingReference}
                      </span>
                      <strong className="font-serif font-bold text-sm text-[#1C1C1C]">
                        {res.customerName}
                      </strong>
                      <span className="px-2 py-0.5 rounded-md bg-[#FAF9F6] border border-[#E8E1DA] text-[10px] font-semibold text-[#4E342E]">
                        {res.partySize} Guests
                      </span>
                    </div>

                    <div className="text-xs text-[#6B625D] mt-1 flex flex-wrap items-center gap-3">
                      <span>{res.reservationDate} at {res.startTime}</span>
                      <span>Table: <strong className="text-[#1C1C1C]">{res.assignedTableName || 'None'}</strong></span>
                      <span>Pre-Order: <strong className="text-[#1C1C1C]">${res.estimatedTotal.toFixed(2)}</strong></span>
                    </div>
                  </div>

                  <div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                      res.status === 'confirmed' ? 'bg-emerald-50 text-emerald-800' :
                      res.status === 'checked_in' ? 'bg-blue-50 text-blue-800' :
                      res.status === 'pending' ? 'bg-amber-50 text-amber-800' :
                      res.status === 'cancelled' ? 'bg-red-50 text-red-800' :
                      'bg-gray-100 text-gray-800'
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
            <div className="bg-white rounded-3xl border border-[#E8E1DA] p-6 shadow-md space-y-6">
              
              <div className="border-b border-[#E8E1DA] pb-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#795548]">
                    Ref: {selectedBooking.bookingReference}
                  </span>
                  <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-[#FAF9F6] border border-[#E8E1DA] text-[#4E342E]">
                    {selectedBooking.status.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="font-serif text-xl font-bold text-[#1C1C1C] mt-1">
                  {selectedBooking.customerName}
                </h3>
                <div className="flex items-center gap-3 text-xs text-[#6B625D] mt-1">
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedBooking.customerPhone}</span>
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {selectedBooking.customerEmail}</span>
                </div>
              </div>

              {/* Status Change Controls (Host Actions) */}
              <div className="space-y-2">
                <span className="block text-xs font-semibold uppercase tracking-wider text-[#6B625D]">
                  Update Arrival & Service Status
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'checked_in')}
                    className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold border border-blue-200 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Guest Arrived (Check In)
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'completed')}
                    className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold border border-gray-300 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Completed & Billed
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'confirmed')}
                    className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200 transition cursor-pointer"
                  >
                    Confirm Booking
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'cancelled')}
                    className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-800 font-semibold border border-red-200 transition cursor-pointer"
                  >
                    Cancel & Free Capacity
                  </button>
                </div>
              </div>

              {/* Table Assignment */}
              <div className="space-y-2 border-t border-[#E8E1DA] pt-4">
                <span className="block text-xs font-semibold uppercase tracking-wider text-[#6B625D]">
                  Assigned Table
                </span>
                <select
                  value={selectedBooking.assignedTableId || ''}
                  onChange={(e) => handleAssignTable(selectedBooking.id, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E1DA] bg-[#FAF9F6] text-xs font-semibold text-[#1C1C1C]"
                >
                  <option value="">No Table Assigned</option>
                  {tables.map(tab => (
                    <option key={tab.id} value={tab.id}>
                      {tab.tableNumber} - {tab.locationArea} ({tab.capacity} Seats)
                    </option>
                  ))}
                </select>
              </div>

              {/* Pre-Ordered Food Dishes (Kitchen Display) */}
              <div className="space-y-3 border-t border-[#E8E1DA] pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-sm text-[#1C1C1C]">
                    Kitchen Pre-Order ({selectedBooking.items?.length || 0} items)
                  </h4>
                  <span className="text-xs font-bold text-[#4E342E]">
                    ${selectedBooking.estimatedTotal.toFixed(2)}
                  </span>
                </div>

                {selectedBooking.items && selectedBooking.items.length > 0 ? (
                  <div className="divide-y divide-[#E8E1DA]/60 max-h-48 overflow-y-auto pr-1">
                    {selectedBooking.items.map((item, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-[#1C1C1C]">{item.quantity}x</span> {item.name}
                        </div>
                        <span className="font-semibold text-[#6B625D]">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#6B625D] italic">
                    Customer selected table-only; food to be ordered at the table.
                  </p>
                )}

                {selectedBooking.specialRequests && (
                  <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E1DA] text-xs text-[#4E342E]">
                    <span className="font-bold block mb-0.5">Guest Notes:</span>
                    {selectedBooking.specialRequests}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#E8E1DA] p-8 text-center text-[#6B625D]">
              <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-[#795548]/50" />
              <p className="text-sm">Click any reservation to inspect guest details, pre-orders, and change service status.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

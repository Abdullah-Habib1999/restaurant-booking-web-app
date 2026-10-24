'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Calendar as CalendarIcon, 
  Utensils, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import { Restaurant, Reservation, DiningTable, PreOrderItem } from '@/types';

export default function OwnerOverviewPage() {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayStr, setTodayStr] = useState('');

  useEffect(() => {
    setTodayStr(new Date().toISOString().split('T')[0]);
    const load = async () => {
      setLoading(true);
      const targetId = user?.ownedRestaurantId || 'rest-1';
      const rest = await db.getRestaurantById(targetId);
      if (rest) {
        setRestaurant(rest);
        const [resList, tabList] = await Promise.all([
          db.getReservations({ restaurantId: rest.id }),
          db.getTables(rest.id)
        ]);
        setReservations(resList);
        setTables(tabList);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  // Compute live statistics directly from DB
  const todayReservations = reservations.filter(r => r.reservationDate === todayStr && r.status !== 'cancelled');
  const upcomingReservations = reservations.filter(r => r.reservationDate >= todayStr && r.status !== 'cancelled');
  const pendingRequests = reservations.filter(r => r.status === 'pending');
  const cancelledBookings = reservations.filter(r => r.status === 'cancelled');

  const totalGuestsExpectedToday = todayReservations.reduce((sum, r) => sum + r.partySize, 0);
  
  // Total pre-ordered food items
  const totalPreOrderedItems = upcomingReservations.reduce((sum, r) => {
    return sum + (r.items?.reduce((iSum: number, item: PreOrderItem) => iSum + item.quantity, 0) || 0);
  }, 0);

  // Total pre-order value
  const estimatedPreOrderRevenue = upcomingReservations.reduce((sum, r) => sum + r.orderSubtotal, 0);

  // Seating capacity utilization
  const totalSeats = restaurant?.totalSeatingCapacity || 48;
  const occupancyPercentage = Math.min(100, Math.round((totalGuestsExpectedToday / totalSeats) * 100));

  return (
    <div className="space-y-8">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#F5F0E9]">
            Restaurant Performance Overview
          </h1>
          <p className="text-sm text-[#B7AAA0] mt-0.5">
            Real-time reservations, dining capacity, and kitchen pre-order flow for {restaurant?.name || "Your Restaurant"}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-[#132A1C] text-[#86EFAC] text-xs font-semibold flex items-center gap-1.5 border border-[#165B33]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Seating Engine Active
          </span>
        </div>
      </div>

      {/* STATS METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Today's Bookings */}
        <div className="p-5 rounded-2xl bg-[#181513] border border-[#332A25] shadow-xl space-y-2">
          <div className="flex items-center justify-between text-[#8D8178]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#B7AAA0]">Today's Bookings</span>
            <div className="w-8 h-8 rounded-lg bg-[#151311] border border-[#332A25] flex items-center justify-center text-[#C6A47E]">
              <CalendarIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#F5F0E9]">
            {todayReservations.length}
          </div>
          <p className="text-xs text-[#8D8178]">
            <strong className="text-[#F5F0E9]">{totalGuestsExpectedToday}</strong> total guests expected today
          </p>
        </div>

        {/* Capacity Occupancy */}
        <div className="p-5 rounded-2xl bg-[#181513] border border-[#332A25] shadow-xl space-y-2">
          <div className="flex items-center justify-between text-[#8D8178]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#B7AAA0]">Seating Occupancy</span>
            <div className="w-8 h-8 rounded-lg bg-[#151311] border border-[#332A25] flex items-center justify-center text-[#C6A47E]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#F5F0E9]">
            {occupancyPercentage}%
          </div>
          <div className="w-full bg-[#151311] rounded-full h-1.5 overflow-hidden border border-[#332A25]">
            <div 
              className="bg-[#8B5E45] h-full rounded-full transition-all duration-500" 
              style={{ width: `${occupancyPercentage}%` }}
            />
          </div>
          <p className="text-[11px] text-[#8D8178]">
            {totalSeats - totalGuestsExpectedToday} available seats remaining
          </p>
        </div>

        {/* Pre-ordered Food Items */}
        <div className="p-5 rounded-2xl bg-[#181513] border border-[#332A25] shadow-xl space-y-2">
          <div className="flex items-center justify-between text-[#8D8178]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#B7AAA0]">Kitchen Pre-Orders</span>
            <div className="w-8 h-8 rounded-lg bg-[#151311] border border-[#332A25] flex items-center justify-center text-[#C6A47E]">
              <Utensils className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#F5F0E9]">
            {totalPreOrderedItems} dishes
          </div>
          <p className="text-xs text-[#8D8178]">
            Across <strong className="text-[#F5F0E9]">{upcomingReservations.length}</strong> upcoming parties
          </p>
        </div>

        {/* Estimated Revenue */}
        <div className="p-5 rounded-2xl bg-[#181513] border border-[#332A25] shadow-xl space-y-2">
          <div className="flex items-center justify-between text-[#8D8178]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#B7AAA0]">Pre-Order Value</span>
            <div className="w-8 h-8 rounded-lg bg-[#151311] border border-[#332A25] flex items-center justify-center text-[#C6A47E]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#C6A47E]">
            ${estimatedPreOrderRevenue.toFixed(2)}
          </div>
          <p className="text-xs text-[#86EFAC] font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Direct kitchen commitments
          </p>
        </div>

      </div>

      {/* RECENT RESERVATIONS & ARRIVAL PACING */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Next Arrivals / Today's Service (8 cols) */}
        <div className="lg:col-span-8 bg-[#181513] rounded-3xl border border-[#332A25] p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#332A25] pb-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#F5F0E9]">
                Today’s Scheduled Arrivals
              </h3>
              <p className="text-xs text-[#8D8178] mt-0.5">
                Staff view for guest check-ins, table assignment, and food prep timing
              </p>
            </div>
            <Link
              href="/owner/reservations"
              className="text-xs font-semibold text-[#C6A47E] hover:text-[#F5F0E9] flex items-center gap-1 transition"
            >
              All Bookings <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {todayReservations.length === 0 ? (
            <p className="text-xs text-[#8D8178] py-8 text-center">
              No reservations scheduled for today yet.
            </p>
          ) : (
            <div className="divide-y divide-[#332A25]/60">
              {todayReservations.map(res => (
                <div key={res.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#C6A47E]">
                        {res.bookingReference}
                      </span>
                      <strong className="text-sm text-[#F5F0E9] font-serif">
                        {res.customerName}
                      </strong>
                      <span className="px-2 py-0.5 rounded-full bg-[#151311] border border-[#332A25] text-[10px] text-[#C6A47E] font-medium">
                        {res.partySize} Guests
                      </span>
                    </div>
                    <div className="text-xs text-[#8D8178] mt-1 flex items-center gap-3">
                      <span>Time: <strong className="text-[#F5F0E9]">{res.startTime}</strong></span>
                      <span>Table: <strong className="text-[#F5F0E9]">{res.assignedTableName || 'Unassigned'}</strong></span>
                      <span>Pre-Order: <strong className="text-[#F5F0E9]">{res.items?.length || 0} items (${res.estimatedTotal.toFixed(2)})</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href="/owner/reservations"
                      className="px-3 py-1.5 rounded-xl bg-[#151311] border border-[#332A25] text-xs font-semibold text-[#F5F0E9] hover:bg-[#38251F] transition"
                    >
                      Manage & Check-In
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Operations Summary (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#181513] rounded-3xl border border-[#332A25] p-6 shadow-2xl space-y-4">
            <h3 className="font-serif text-base font-bold text-[#F5F0E9]">
              Operational Status
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between p-2.5 rounded-xl bg-[#151311] border border-[#332A25]">
                <span className="text-[#B7AAA0]">Active Tables Configured</span>
                <strong className="text-[#F5F0E9]">{tables.filter(t => t.isActive).length} tables</strong>
              </div>

              <div className="flex justify-between p-2.5 rounded-xl bg-[#151311] border border-[#332A25]">
                <span className="text-[#B7AAA0]">Pending Requests</span>
                <strong className="text-[#C6A47E]">{pendingRequests.length} pending</strong>
              </div>

              <div className="flex justify-between p-2.5 rounded-xl bg-[#151311] border border-[#332A25]">
                <span className="text-[#B7AAA0]">Cancelled Reservations</span>
                <strong className="text-rose-400">{cancelledBookings.length}</strong>
              </div>

              <div className="flex justify-between p-2.5 rounded-xl bg-[#151311] border border-[#332A25]">
                <span className="text-[#B7AAA0]">Slot Duration</span>
                <strong className="text-[#F5F0E9]">{restaurant?.slotDurationMinutes || 90} mins</strong>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/owner/tables"
                className="w-full py-2.5 px-3 rounded-xl bg-[#8B5E45] hover:bg-[#9E6C51] text-[#F5F0E9] text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-md"
              >
                Configure Tables & Capacity
              </Link>
            </div>
          </div>

          {/* Customer Reviews & Reputation Card */}
          <div className="bg-[#181513] rounded-3xl border border-[#332A25] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-bold text-[#F5F0E9]">
                Guest Reviews & Rating
              </h3>
              <span className="text-xs font-bold text-[#C6A47E] flex items-center gap-1">
                ★ {restaurant?.rating && restaurant.reviewCount && restaurant.reviewCount > 0 ? `${restaurant.rating.toFixed(1)}/5` : 'No reviews'}
              </span>
            </div>

            <p className="text-xs text-[#8D8178]">
              {restaurant?.reviewCount && restaurant.reviewCount > 0 
                ? `Total of ${restaurant.reviewCount} verified dining reviews from completed reservations.`
                : 'No reviews yet. Completed diner bookings will prompt guest feedback.'}
            </p>

            <Link
              href="/owner/reviews"
              className="w-full py-2.5 px-3 rounded-xl bg-[#151311] border border-[#332A25] hover:bg-[#38251F] text-[#F5F0E9] text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              Manage & Respond to Reviews <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}

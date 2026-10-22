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
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1C1C]">
            Restaurant Performance Overview
          </h1>
          <p className="text-sm text-[#6B625D] mt-0.5">
            Real-time reservations, dining capacity, and kitchen pre-order flow for {restaurant?.name || "Your Restaurant"}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Seating Engine Active
          </span>
        </div>
      </div>

      {/* STATS METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Today's Bookings */}
        <div className="p-5 rounded-2xl bg-white border border-[#E8E1DA] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#6B625D]">
            <span className="text-xs font-bold uppercase tracking-wider">Today's Bookings</span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF9F6] border border-[#E8E1DA] flex items-center justify-center text-[#795548]">
              <CalendarIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#1C1C1C]">
            {todayReservations.length}
          </div>
          <p className="text-xs text-[#6B625D]">
            <strong className="text-[#1C1C1C]">{totalGuestsExpectedToday}</strong> total guests expected today
          </p>
        </div>

        {/* Capacity Occupancy */}
        <div className="p-5 rounded-2xl bg-white border border-[#E8E1DA] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#6B625D]">
            <span className="text-xs font-bold uppercase tracking-wider">Seating Occupancy</span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF9F6] border border-[#E8E1DA] flex items-center justify-center text-[#795548]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#1C1C1C]">
            {occupancyPercentage}%
          </div>
          <div className="w-full bg-[#FAF9F6] rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-[#795548] h-full rounded-full transition-all duration-500" 
              style={{ width: `${occupancyPercentage}%` }}
            />
          </div>
          <p className="text-[11px] text-[#6B625D]">
            {totalSeats - totalGuestsExpectedToday} available seats remaining
          </p>
        </div>

        {/* Pre-ordered Food Items */}
        <div className="p-5 rounded-2xl bg-white border border-[#E8E1DA] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#6B625D]">
            <span className="text-xs font-bold uppercase tracking-wider">Kitchen Pre-Orders</span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF9F6] border border-[#E8E1DA] flex items-center justify-center text-[#795548]">
              <Utensils className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#1C1C1C]">
            {totalPreOrderedItems} dishes
          </div>
          <p className="text-xs text-[#6B625D]">
            Across <strong className="text-[#1C1C1C]">{upcomingReservations.length}</strong> upcoming parties
          </p>
        </div>

        {/* Estimated Revenue */}
        <div className="p-5 rounded-2xl bg-white border border-[#E8E1DA] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#6B625D]">
            <span className="text-xs font-bold uppercase tracking-wider">Pre-Order Value</span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF9F6] border border-[#E8E1DA] flex items-center justify-center text-[#795548]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#1C1C1C]">
            ${estimatedPreOrderRevenue.toFixed(2)}
          </div>
          <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Direct kitchen commitments
          </p>
        </div>

      </div>

      {/* RECENT RESERVATIONS & ARRIVAL PACING */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Next Arrivals / Today's Service (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-[#E8E1DA] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8E1DA] pb-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#1C1C1C]">
                Today’s Scheduled Arrivals
              </h3>
              <p className="text-xs text-[#6B625D] mt-0.5">
                Staff view for guest check-ins, table assignment, and food prep timing
              </p>
            </div>
            <Link
              href="/owner/reservations"
              className="text-xs font-semibold text-[#795548] hover:text-[#4E342E] flex items-center gap-1"
            >
              All Bookings <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {todayReservations.length === 0 ? (
            <p className="text-xs text-[#6B625D] py-8 text-center">
              No reservations scheduled for today yet.
            </p>
          ) : (
            <div className="divide-y divide-[#E8E1DA]/60">
              {todayReservations.map(res => (
                <div key={res.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#4E342E]">
                        {res.bookingReference}
                      </span>
                      <strong className="text-sm text-[#1C1C1C] font-serif">
                        {res.customerName}
                      </strong>
                      <span className="px-2 py-0.5 rounded-full bg-[#FAF9F6] border border-[#E8E1DA] text-[10px] text-[#4E342E] font-medium">
                        {res.partySize} Guests
                      </span>
                    </div>
                    <div className="text-xs text-[#6B625D] mt-1 flex items-center gap-3">
                      <span>Time: <strong className="text-[#1C1C1C]">{res.startTime}</strong></span>
                      <span>Table: <strong className="text-[#1C1C1C]">{res.assignedTableName || 'Unassigned'}</strong></span>
                      <span>Pre-Order: <strong className="text-[#1C1C1C]">{res.items?.length || 0} items (${res.estimatedTotal.toFixed(2)})</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href="/owner/reservations"
                      className="px-3 py-1.5 rounded-xl bg-[#FAF9F6] border border-[#E8E1DA] text-xs font-semibold text-[#4E342E] hover:bg-[#E8E1DA]/60 transition"
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
          <div className="bg-white rounded-3xl border border-[#E8E1DA] p-6 shadow-xs space-y-4">
            <h3 className="font-serif text-base font-bold text-[#1C1C1C]">
              Operational Status
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between p-2.5 rounded-xl bg-[#FAF9F6]">
                <span className="text-[#6B625D]">Active Tables Configured</span>
                <strong className="text-[#1C1C1C]">{tables.filter(t => t.isActive).length} tables</strong>
              </div>

              <div className="flex justify-between p-2.5 rounded-xl bg-[#FAF9F6]">
                <span className="text-[#6B625D]">Pending Requests</span>
                <strong className="text-[#1C1C1C]">{pendingRequests.length} pending</strong>
              </div>

              <div className="flex justify-between p-2.5 rounded-xl bg-[#FAF9F6]">
                <span className="text-[#6B625D]">Cancelled Reservations</span>
                <strong className="text-[#1C1C1C]">{cancelledBookings.length}</strong>
              </div>

              <div className="flex justify-between p-2.5 rounded-xl bg-[#FAF9F6]">
                <span className="text-[#6B625D]">Slot Duration</span>
                <strong className="text-[#1C1C1C]">{restaurant?.slotDurationMinutes || 90} mins</strong>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/owner/tables"
                className="w-full py-2.5 px-3 rounded-xl bg-[#4E342E] hover:bg-[#795548] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                Configure Tables & Capacity
              </Link>
            </div>
          </div>

          {/* Customer Reviews & Reputation Card */}
          <div className="bg-white rounded-3xl border border-[#E8E1DA] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-bold text-[#1C1C1C]">
                Guest Reviews & Rating
              </h3>
              <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                ★ {restaurant?.rating && restaurant.reviewCount && restaurant.reviewCount > 0 ? `${restaurant.rating.toFixed(1)}/5` : 'No reviews'}
              </span>
            </div>

            <p className="text-xs text-[#6B625D]">
              {restaurant?.reviewCount && restaurant.reviewCount > 0 
                ? `Total of ${restaurant.reviewCount} verified dining reviews from completed reservations.`
                : 'No reviews yet. Completed diner bookings will prompt guest feedback.'}
            </p>

            <Link
              href="/owner/reviews"
              className="w-full py-2.5 px-3 rounded-xl bg-[#FAF9F6] border border-[#E8E1DA] hover:bg-[#E8E1DA] text-[#4E342E] text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              Manage & Respond to Reviews <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}

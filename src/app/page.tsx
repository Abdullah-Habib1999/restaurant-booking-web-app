'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Calendar as CalendarIcon, 
  Users, 
  Clock, 
  Star, 
  MapPin, 
  Utensils, 
  ShieldCheck, 
  ChevronRight, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { db } from '@/lib/db';
import { Restaurant } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('2026-10-22');
  const [minDate, setMinDate] = useState('2026-10-21');
  const [selectedGuests, setSelectedGuests] = useState('2');
  const [selectedTime, setSelectedTime] = useState('19:00');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    setMinDate(today);
    const fetchRestaurants = async () => {
      const data = await db.getRestaurants();
      setRestaurants(data.filter(r => r.status === 'published'));
    };
    fetchRestaurants();
  }, []);

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/restaurants?q=${encodeURIComponent(searchQuery)}&date=${selectedDate}&guests=${selectedGuests}&time=${selectedTime}`);
  };

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* HERO SECTION */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden bg-gradient-to-b from-[#FAF9F6] via-white to-[#FAF9F6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E8E1DA]/50 border border-[#E8E1DA] text-[#4E342E] text-xs font-semibold tracking-wide uppercase mb-6">
              <Sparkles className="w-3.5 h-3.5 text-[#795548]" />
              Multi-Restaurant Reservation & Pre-Ordering
            </div>
            
            <h1 className="font-serif text-4xl sm:text-6xl font-bold tracking-tight text-[#1C1C1C] leading-[1.15]">
              Your Table. Your Time. <span className="text-[#795548] italic">Your Order.</span>
            </h1>
            
            <p className="mt-6 text-lg sm:text-xl text-[#6B625D] font-normal leading-relaxed">
              Skip the line and the menu hesitation. Book verified table availability and pre-order Chef-crafted courses so your food is prepared right as you sit down.
            </p>
          </div>

          {/* QUICK BOOKING & SEARCH FORM */}
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl shadow-[#4E342E]/5 border border-[#E8E1DA] p-4 sm:p-6 transition-all">
            <form onSubmit={handleQuickSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Restaurant / Cuisine Search */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B625D]">
                  Restaurant or Cuisine
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-[#795548] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. Italian, Wood-fired, Osteria"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#E8E1DA] text-sm text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#795548]/30 focus:border-[#795548] bg-[#FAF9F6]/50"
                  />
                </div>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B625D]">
                  Visit Date
                </label>
                <div className="relative">
                  <CalendarIcon className="w-4 h-4 text-[#795548] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={selectedDate}
                    min={minDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#E8E1DA] text-sm text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#795548]/30 focus:border-[#795548] bg-[#FAF9F6]/50"
                  />
                </div>
              </div>

              {/* Guests */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B625D]">
                  Party Size
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-[#795548] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={selectedGuests}
                    onChange={(e) => setSelectedGuests(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#E8E1DA] text-sm text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#795548]/30 focus:border-[#795548] bg-[#FAF9F6]/50 appearance-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 14].map(num => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'Guest' : 'Guests'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search Submit Button */}
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#4E342E] hover:bg-[#795548] text-white font-medium text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  Find Available Tables
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </form>
          </div>

          {/* Quick value props */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12">
            <div className="flex items-center gap-3.5 p-4 rounded-xl bg-white border border-[#E8E1DA]/60">
              <div className="w-10 h-10 rounded-lg bg-[#FAF9F6] border border-[#E8E1DA] flex items-center justify-center text-[#795548] shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#1C1C1C]">Guaranteed Seating</h4>
                <p className="text-xs text-[#6B625D] mt-0.5">Real-time capacity verification with no overbooking.</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-4 rounded-xl bg-white border border-[#E8E1DA]/60">
              <div className="w-10 h-10 rounded-lg bg-[#FAF9F6] border border-[#E8E1DA] flex items-center justify-center text-[#795548] shrink-0">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#1C1C1C]">Advance Food Pre-Order</h4>
                <p className="text-xs text-[#6B625D] mt-0.5">Dishes fired on schedule so your table is served immediately.</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-4 rounded-xl bg-white border border-[#E8E1DA]/60">
              <div className="w-10 h-10 rounded-lg bg-[#FAF9F6] border border-[#E8E1DA] flex items-center justify-center text-[#795548] shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#1C1C1C]">Flexible Management</h4>
                <p className="text-xs text-[#6B625D] mt-0.5">Modify or cancel anytime within restaurant policy.</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* FEATURED RESTAURANTS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1C1C]">
              Featured Dining Destinations
            </h2>
            <p className="text-sm text-[#6B625D] mt-1">
              Top curated restaurants accepting verified reservations & pre-orders
            </p>
          </div>
          <Link
            href="/restaurants"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#795548] hover:text-[#4E342E] transition"
          >
            Explore all restaurants
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {restaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              className="group bg-white rounded-2xl border border-[#E8E1DA] overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              {/* Cover Image */}
              <div className="relative h-52 w-full overflow-hidden bg-gray-100">
                <img
                  src={restaurant.coverImageUrl}
                  alt={restaurant.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold text-[#1C1C1C] flex items-center gap-1 shadow-sm">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  {restaurant.rating}
                  <span className="text-[#6B625D] font-normal">({restaurant.reviewCount})</span>
                </div>
                <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-md bg-[#1C1C1C]/75 backdrop-blur-md text-white text-xs font-medium">
                    {restaurant.priceTier}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-white/90 backdrop-blur-md text-[#4E342E] text-xs font-semibold">
                    {restaurant.cuisineType[0]}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#1C1C1C] group-hover:text-[#795548] transition-colors">
                    {restaurant.name}
                  </h3>
                  <p className="text-xs text-[#795548] font-medium mt-0.5">
                    {restaurant.tagline}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-3 text-xs text-[#6B625D]">
                    <MapPin className="w-3.5 h-3.5 text-[#795548] shrink-0" />
                    <span>{restaurant.address}, {restaurant.city}</span>
                  </div>

                  <p className="text-sm text-[#6B625D] mt-3 line-clamp-2">
                    {restaurant.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#E8E1DA] flex items-center justify-between">
                  <div className="text-xs text-[#6B625D]">
                    <span className="font-semibold text-[#1C1C1C]">{restaurant.totalSeatingCapacity}</span> Total Seats
                  </div>
                  <Link
                    href={`/restaurants/${restaurant.slug}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4E342E] hover:bg-[#795548] text-white text-xs font-semibold transition shadow-xs"
                  >
                    Reserve & Pre-Order
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS / STEP BY STEP BANNER */}
      <section className="bg-white border-y border-[#E8E1DA] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1C1C]">
              The Connected Reservation & Pre-Order Journey
            </h2>
            <p className="text-sm text-[#6B625D] mt-2">
              Designed so both diners and restaurant kitchens operate in seamless harmony.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E8E1DA]/60 text-[#4E342E] font-serif font-bold text-lg flex items-center justify-center mx-auto">
                1
              </div>
              <h4 className="font-semibold text-base text-[#1C1C1C]">Pick Date & Party</h4>
              <p className="text-xs text-[#6B625D] leading-relaxed">
                Live availability engine verifies table capacity and operating hours instantaneously.
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E8E1DA]/60 text-[#4E342E] font-serif font-bold text-lg flex items-center justify-center mx-auto">
                2
              </div>
              <h4 className="font-semibold text-base text-[#1C1C1C]">Advance Pre-Order</h4>
              <p className="text-xs text-[#6B625D] leading-relaxed">
                Choose appetizers, mains, and desserts with locked-in prices, or opt to order on site.
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E8E1DA]/60 text-[#4E342E] font-serif font-bold text-lg flex items-center justify-center mx-auto">
                3
              </div>
              <h4 className="font-semibold text-base text-[#1C1C1C]">Instant Reference</h4>
              <p className="text-xs text-[#6B625D] leading-relaxed">
                Receive your confirmed booking reference with complete itemized order breakdown.
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E8E1DA]/60 text-[#4E342E] font-serif font-bold text-lg flex items-center justify-center mx-auto">
                4
              </div>
              <h4 className="font-semibold text-base text-[#1C1C1C]">Arrive & Dine</h4>
              <p className="text-xs text-[#6B625D] leading-relaxed">
                Staff welcomes you by name, confirms arrival, and kitchen prepares your chosen courses.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* RESTAURANT OWNER CTA BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-[#4E342E] text-white p-8 sm:p-12 md:p-16 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl z-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#D7CCC8]">
              For Restaurant Operators
            </span>
            <h3 className="font-serif text-3xl sm:text-4xl font-bold mt-2">
              Transform table turnover and kitchen pacing.
            </h3>
            <p className="text-sm sm:text-base text-[#D7CCC8] mt-4 leading-relaxed">
              Register your venue, manage individual tables or total capacity, upload digital menus, and receive pre-ordered reservations with full party details.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/partner/register"
                className="px-6 py-3 rounded-xl bg-white text-[#3B2924] font-semibold text-sm hover:bg-[#F8F5F0] transition shadow-md"
              >
                Register Your Restaurant
              </Link>
              <Link
                href="/partner"
                className="px-6 py-3 rounded-xl bg-[#795548] text-white font-semibold text-sm hover:bg-[#8D6E63] transition border border-[#8D6E63]"
              >
                Learn About Partnership
              </Link>
            </div>
          </div>

          <div className="hidden md:block w-72 h-72 rounded-2xl overflow-hidden border border-white/20 shadow-2xl relative z-10 shrink-0">
            <img
              src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80"
              alt="Restaurant Host"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

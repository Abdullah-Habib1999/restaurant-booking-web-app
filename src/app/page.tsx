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
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden bg-gradient-to-b from-[#0B0B0B] via-[#111111] to-[#0B0B0B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#181513] border border-[#332A25] text-[#C6A47E] text-xs font-semibold tracking-wider uppercase mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#C6A47E]" />
              Multi-Restaurant Reservation & Pre-Ordering
            </div>
            
            <h1 className="font-serif text-4xl sm:text-6xl font-bold tracking-tight text-[#F5F0E9] leading-[1.15]">
              Your Table. Your Time. <span className="text-[#C6A47E] italic font-serif">Your Order.</span>
            </h1>
            
            <p className="mt-6 text-lg sm:text-xl text-[#B7AAA0] font-normal leading-relaxed">
              Skip the line and the menu hesitation. Book verified table availability and pre-order Chef-crafted courses so your food is prepared right as you sit down.
            </p>
          </div>

          {/* QUICK BOOKING & SEARCH FORM */}
          <div className="max-w-4xl mx-auto bg-[#181513] rounded-2xl shadow-2xl shadow-black/70 border border-[#332A25] p-4 sm:p-6 transition-all">
            <form onSubmit={handleQuickSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Restaurant / Cuisine Search */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#C6A47E]">
                  Restaurant or Cuisine
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-[#C6A47E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. Italian, Wood-fired, Osteria"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#332A25] text-sm text-[#F5F0E9] placeholder-[#8D8178] focus:outline-none focus:ring-2 focus:ring-[#8B5E45]/40 focus:border-[#8B5E45] bg-[#151311] transition-colors"
                  />
                </div>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#C6A47E]">
                  Visit Date
                </label>
                <div className="relative">
                  <CalendarIcon className="w-4 h-4 text-[#C6A47E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={selectedDate}
                    min={minDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#332A25] text-sm text-[#F5F0E9] focus:outline-none focus:ring-2 focus:ring-[#8B5E45]/40 focus:border-[#8B5E45] bg-[#151311] transition-colors"
                  />
                </div>
              </div>

              {/* Guests */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#C6A47E]">
                  Party Size
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-[#C6A47E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={selectedGuests}
                    onChange={(e) => setSelectedGuests(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#332A25] text-sm text-[#F5F0E9] focus:outline-none focus:ring-2 focus:ring-[#8B5E45]/40 focus:border-[#8B5E45] bg-[#151311] transition-colors appearance-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 14].map(num => (
                      <option key={num} value={num} className="bg-[#181513] text-[#F5F0E9]">
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
                  className="w-full py-2.5 px-4 rounded-xl bg-[#8B5E45] hover:bg-[#9E6C51] text-[#F5F0E9] font-semibold text-sm transition-all duration-200 shadow-lg shadow-black/40 hover:shadow-black/60 flex items-center justify-center gap-2 cursor-pointer border border-[#8B5E45]/70"
                >
                  Find Available Tables
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </form>
          </div>

          {/* Quick value props */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12">
            <div className="flex items-center gap-3.5 p-4 rounded-xl bg-[#181513] border border-[#332A25]">
              <div className="w-10 h-10 rounded-lg bg-[#1C1917] border border-[#332A25] flex items-center justify-center text-[#C6A47E] shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#F5F0E9]">Guaranteed Seating</h4>
                <p className="text-xs text-[#B7AAA0] mt-0.5">Real-time capacity verification with no overbooking.</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-4 rounded-xl bg-[#181513] border border-[#332A25]">
              <div className="w-10 h-10 rounded-lg bg-[#1C1917] border border-[#332A25] flex items-center justify-center text-[#C6A47E] shrink-0">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#F5F0E9]">Advance Food Pre-Order</h4>
                <p className="text-xs text-[#B7AAA0] mt-0.5">Dishes fired on schedule so your table is served immediately.</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-4 rounded-xl bg-[#181513] border border-[#332A25]">
              <div className="w-10 h-10 rounded-lg bg-[#1C1917] border border-[#332A25] flex items-center justify-center text-[#C6A47E] shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#F5F0E9]">Flexible Management</h4>
                <p className="text-xs text-[#B7AAA0] mt-0.5">Modify or cancel anytime within restaurant policy.</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* FEATURED RESTAURANTS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#C6A47E]">
              Exquisite Selections
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#F5F0E9] mt-1">
              Featured Dining Destinations
            </h2>
            <p className="text-sm text-[#B7AAA0] mt-1">
              Top curated restaurants accepting verified reservations & pre-orders
            </p>
          </div>
          <Link
            href="/restaurants"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#C6A47E] hover:text-[#DFC4A5] transition"
          >
            Explore all restaurants
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {restaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              className="group bg-[#1C1917] rounded-2xl border border-[#332A25] hover:border-[#54372D] overflow-hidden shadow-lg shadow-black/40 hover:shadow-black/70 transition-all duration-300 flex flex-col"
            >
              {/* Cover Image */}
              <div className="relative h-56 w-full overflow-hidden bg-[#151311]">
                <img
                  src={restaurant.coverImageUrl}
                  alt={restaurant.name}
                  className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
                />
                <div className="absolute top-3 right-3 bg-[#151311]/90 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold text-[#F5F0E9] flex items-center gap-1 border border-[#332A25] shadow-md">
                  {restaurant.reviewCount && restaurant.reviewCount > 0 ? (
                    <>
                      <Star className="w-3.5 h-3.5 text-[#C6A47E] fill-[#C6A47E]" />
                      <span>{restaurant.rating?.toFixed(1)}/5</span>
                      <span className="text-[#8D8178] font-normal">
                        ({restaurant.reviewCount} {restaurant.reviewCount === 1 ? 'review' : 'reviews'})
                      </span>
                    </>
                  ) : (
                    <>
                      <Star className="w-3.5 h-3.5 text-[#54372D]" />
                      <span className="text-[#8D8178] font-normal text-[11px]">No reviews yet</span>
                    </>
                  )}
                </div>
                <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-md bg-[#0B0B0B]/85 backdrop-blur-md text-[#F5F0E9] text-xs font-medium border border-[#332A25]/60">
                    {restaurant.priceTier}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-[#38251F]/90 backdrop-blur-md text-[#C6A47E] text-xs font-semibold border border-[#54372D]">
                    {restaurant.cuisineType[0]}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#F5F0E9] group-hover:text-[#C6A47E] transition-colors">
                    {restaurant.name}
                  </h3>
                  <p className="text-xs text-[#C6A47E] font-medium mt-0.5">
                    {restaurant.tagline}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-3 text-xs text-[#B7AAA0]">
                    <MapPin className="w-3.5 h-3.5 text-[#C6A47E] shrink-0" />
                    <span>{restaurant.address}, {restaurant.city}</span>
                  </div>

                  <p className="text-sm text-[#B7AAA0] mt-3 line-clamp-2 leading-relaxed">
                    {restaurant.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#332A25] flex items-center justify-between">
                  <div className="text-xs text-[#B7AAA0]">
                    <span className="font-semibold text-[#F5F0E9]">{restaurant.totalSeatingCapacity}</span> Total Seats
                  </div>
                  <Link
                    href={`/restaurants/${restaurant.slug}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8B5E45] hover:bg-[#9E6C51] text-[#F5F0E9] text-xs font-semibold transition shadow-xs border border-[#8B5E45]/80"
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
      <section className="bg-[#111111] border-y border-[#332A25] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#C6A47E]">
              Seamless Experience
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#F5F0E9] mt-1">
              The Connected Reservation & Pre-Order Journey
            </h2>
            <p className="text-sm text-[#B7AAA0] mt-2">
              Designed so both diners and restaurant kitchens operate in seamless harmony.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center space-y-3 p-5 rounded-2xl bg-[#181513] border border-[#332A25]">
              <div className="w-12 h-12 rounded-2xl bg-[#1C1917] border border-[#332A25] text-[#C6A47E] font-serif font-bold text-lg flex items-center justify-center mx-auto shadow-sm">
                1
              </div>
              <h4 className="font-semibold text-base text-[#F5F0E9]">Pick Date & Party</h4>
              <p className="text-xs text-[#B7AAA0] leading-relaxed">
                Live availability engine verifies table capacity and operating hours instantaneously.
              </p>
            </div>

            <div className="text-center space-y-3 p-5 rounded-2xl bg-[#181513] border border-[#332A25]">
              <div className="w-12 h-12 rounded-2xl bg-[#1C1917] border border-[#332A25] text-[#C6A47E] font-serif font-bold text-lg flex items-center justify-center mx-auto shadow-sm">
                2
              </div>
              <h4 className="font-semibold text-base text-[#F5F0E9]">Advance Pre-Order</h4>
              <p className="text-xs text-[#B7AAA0] leading-relaxed">
                Choose appetizers, mains, and desserts with locked-in prices, or opt to order on site.
              </p>
            </div>

            <div className="text-center space-y-3 p-5 rounded-2xl bg-[#181513] border border-[#332A25]">
              <div className="w-12 h-12 rounded-2xl bg-[#1C1917] border border-[#332A25] text-[#C6A47E] font-serif font-bold text-lg flex items-center justify-center mx-auto shadow-sm">
                3
              </div>
              <h4 className="font-semibold text-base text-[#F5F0E9]">Instant Reference</h4>
              <p className="text-xs text-[#B7AAA0] leading-relaxed">
                Receive your confirmed booking reference with complete itemized order breakdown.
              </p>
            </div>

            <div className="text-center space-y-3 p-5 rounded-2xl bg-[#181513] border border-[#332A25]">
              <div className="w-12 h-12 rounded-2xl bg-[#1C1917] border border-[#332A25] text-[#C6A47E] font-serif font-bold text-lg flex items-center justify-center mx-auto shadow-sm">
                4
              </div>
              <h4 className="font-semibold text-base text-[#F5F0E9]">Arrive & Dine</h4>
              <p className="text-xs text-[#B7AAA0] leading-relaxed">
                Staff welcomes you by name, confirms arrival, and kitchen prepares your chosen courses.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* RESTAURANT OWNER CTA BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-[#181513] via-[#1C1917] to-[#181513] border border-[#332A25] text-[#F5F0E9] p-8 sm:p-12 md:p-16 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-black/80">
          <div className="max-w-xl z-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#C6A47E]">
              For Restaurant Operators
            </span>
            <h3 className="font-serif text-3xl sm:text-4xl font-bold mt-2 text-[#F5F0E9]">
              Transform table turnover and kitchen pacing.
            </h3>
            <p className="text-sm sm:text-base text-[#B7AAA0] mt-4 leading-relaxed">
              Register your venue, manage individual tables or total capacity, upload digital menus, and receive pre-ordered reservations with full party details.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/partner/register"
                className="px-6 py-3 rounded-xl bg-[#8B5E45] hover:bg-[#9E6C51] text-[#F5F0E9] font-semibold text-sm transition shadow-md border border-[#8B5E45]/80"
              >
                Register Your Restaurant
              </Link>
              <Link
                href="/partner"
                className="px-6 py-3 rounded-xl bg-[#151311] hover:bg-[#1C1917] text-[#C6A47E] font-semibold text-sm transition border border-[#332A25]"
              >
                Learn About Partnership
              </Link>
            </div>
          </div>

          <div className="hidden md:block w-72 h-72 rounded-2xl overflow-hidden border border-[#332A25] shadow-2xl relative z-10 shrink-0">
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

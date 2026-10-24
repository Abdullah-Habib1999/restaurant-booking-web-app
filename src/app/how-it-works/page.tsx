import React from 'react';
import Link from 'next/link';
import { Compass, Calendar, Utensils, Clock, ShieldCheck, ArrowRight } from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      <div className="text-center space-y-3">
        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#F5F0E9]">
          How TableReserve Works
        </h1>
        <p className="text-sm sm:text-base text-[#B7AAA0] max-w-xl mx-auto">
          A seamless blend of genuine restaurant table reservations and advance food pre-ordering.
        </p>
      </div>

      <div className="space-y-6">
        <div className="p-8 rounded-3xl bg-[#181513] border border-[#332A25] shadow-2xl flex flex-col md:flex-row gap-6 items-start">
          <div className="w-12 h-12 rounded-2xl bg-[#38251F] text-[#C6A47E] border border-[#54372D] flex items-center justify-center font-serif text-xl shrink-0 shadow-md">
            1
          </div>
          <div className="space-y-2">
            <h3 className="font-serif text-xl font-bold text-[#F5F0E9]">Discover & Choose Your Venue</h3>
            <p className="text-xs sm:text-sm text-[#B7AAA0] leading-relaxed">
              Browse top dining destinations by cuisine, location, or atmosphere. Every restaurant profile displays verified operating hours, seating limits, and complete menus with dietary markings.
            </p>
          </div>
        </div>

        <div className="p-8 rounded-3xl bg-[#181513] border border-[#332A25] shadow-2xl flex flex-col md:flex-row gap-6 items-start">
          <div className="w-12 h-12 rounded-2xl bg-[#38251F] text-[#C6A47E] border border-[#54372D] flex items-center justify-center font-serif text-xl shrink-0 shadow-md">
            2
          </div>
          <div className="space-y-2">
            <h3 className="font-serif text-xl font-bold text-[#F5F0E9]">Verify Genuine Table Availability</h3>
            <p className="text-xs sm:text-sm text-[#B7AAA0] leading-relaxed">
              Select your visit date, time slot, and guest count. Our automated allocation engine checks both the restaurant's total capacity ceiling and individual table sizes in real time, preventing double-bookings.
            </p>
          </div>
        </div>

        <div className="p-8 rounded-3xl bg-[#181513] border border-[#332A25] shadow-2xl flex flex-col md:flex-row gap-6 items-start">
          <div className="w-12 h-12 rounded-2xl bg-[#38251F] text-[#C6A47E] border border-[#54372D] flex items-center justify-center font-serif text-xl shrink-0 shadow-md">
            3
          </div>
          <div className="space-y-2">
            <h3 className="font-serif text-xl font-bold text-[#F5F0E9]">Advance Culinary Pre-Ordering (Optional)</h3>
            <p className="text-xs sm:text-sm text-[#B7AAA0] leading-relaxed">
              Choose your courses, appetizers, and signature desserts beforehand with locked-in prices, or opt to order on site. Pre-ordering enables the kitchen to prepare your dishes right as you are seated.
            </p>
          </div>
        </div>

        <div className="p-8 rounded-3xl bg-[#181513] border border-[#332A25] shadow-2xl flex flex-col md:flex-row gap-6 items-start">
          <div className="w-12 h-12 rounded-2xl bg-[#38251F] text-[#C6A47E] border border-[#54372D] flex items-center justify-center font-serif text-xl shrink-0 shadow-md">
            4
          </div>
          <div className="space-y-2">
            <h3 className="font-serif text-xl font-bold text-[#F5F0E9]">Instant Booking Reference & Arrival</h3>
            <p className="text-xs sm:text-sm text-[#B7AAA0] leading-relaxed">
              Receive your confirmed booking ID. When you arrive, the host confirms your party and welcomes you to your assigned table. Payment for meals is handled directly at the restaurant.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center pt-4">
        <Link
          href="/restaurants"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#8B5E45] hover:bg-[#9E6C51] text-[#F5F0E9] font-semibold text-xs transition duration-200 shadow-lg"
        >
          <span>Find Available Tables Now</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

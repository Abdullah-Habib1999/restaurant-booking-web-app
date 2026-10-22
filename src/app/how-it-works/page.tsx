import React from 'react';
import Link from 'next/link';
import { Compass, Calendar, Utensils, Clock, ShieldCheck, ArrowRight } from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      <div className="text-center space-y-3">
        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#201B18]">
          How TableReserve Works
        </h1>
        <p className="text-sm sm:text-base text-[#776B63] max-w-xl mx-auto">
          A seamless blend of genuine restaurant table reservations and advance food pre-ordering.
        </p>
      </div>

      <div className="space-y-8">
        <div className="p-8 rounded-3xl bg-white border border-[#E6DDD3] shadow-xs flex flex-col md:flex-row gap-6 items-start">
          <div className="w-12 h-12 rounded-2xl bg-[#3B2924] text-white flex items-center justify-center font-serif text-xl shrink-0">
            1
          </div>
          <div className="space-y-2">
            <h3 className="font-serif text-xl font-bold text-[#201B18]">Discover & Choose Your Venue</h3>
            <p className="text-xs sm:text-sm text-[#776B63] leading-relaxed">
              Browse top dining destinations by cuisine, location, or atmosphere. Every restaurant profile displays verified operating hours, seating limits, and complete menus with dietary markings.
            </p>
          </div>
        </div>

        <div className="p-8 rounded-3xl bg-white border border-[#E6DDD3] shadow-xs flex flex-col md:flex-row gap-6 items-start">
          <div className="w-12 h-12 rounded-2xl bg-[#3B2924] text-white flex items-center justify-center font-serif text-xl shrink-0">
            2
          </div>
          <div className="space-y-2">
            <h3 className="font-serif text-xl font-bold text-[#201B18]">Verify Genuine Table Availability</h3>
            <p className="text-xs sm:text-sm text-[#776B63] leading-relaxed">
              Select your visit date, time slot, and guest count. Our automated allocation engine checks both the restaurant's total capacity ceiling and individual table sizes in real time, preventing double-bookings.
            </p>
          </div>
        </div>

        <div className="p-8 rounded-3xl bg-white border border-[#E6DDD3] shadow-xs flex flex-col md:flex-row gap-6 items-start">
          <div className="w-12 h-12 rounded-2xl bg-[#3B2924] text-white flex items-center justify-center font-serif text-xl shrink-0">
            3
          </div>
          <div className="space-y-2">
            <h3 className="font-serif text-xl font-bold text-[#201B18]">Advance Culinary Pre-Ordering (Optional)</h3>
            <p className="text-xs sm:text-sm text-[#776B63] leading-relaxed">
              Choose your courses, appetizers, and signature desserts beforehand with locked-in prices, or opt to order on site. Pre-ordering enables the kitchen to prepare your dishes right as you are seated.
            </p>
          </div>
        </div>

        <div className="p-8 rounded-3xl bg-white border border-[#E6DDD3] shadow-xs flex flex-col md:flex-row gap-6 items-start">
          <div className="w-12 h-12 rounded-2xl bg-[#3B2924] text-white flex items-center justify-center font-serif text-xl shrink-0">
            4
          </div>
          <div className="space-y-2">
            <h3 className="font-serif text-xl font-bold text-[#201B18]">Instant Booking Reference & Arrival</h3>
            <p className="text-xs sm:text-sm text-[#776B63] leading-relaxed">
              Receive your confirmed booking ID. When you arrive, the host confirms your party and welcomes you to your assigned table. Payment for meals is handled directly at the restaurant.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center pt-4">
        <Link
          href="/restaurants"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#3B2924] hover:bg-[#795548] text-white font-semibold text-xs transition shadow-sm"
        >
          <span>Find Available Tables Now</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

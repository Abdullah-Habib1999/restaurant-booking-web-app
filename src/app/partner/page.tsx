'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Store, 
  UtensilsCrossed, 
  Calendar, 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Clock
} from 'lucide-react';

export default function PartnerLandingPage() {
  return (
    <div className="space-y-20 py-12">
      
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E9DFD2] text-[#3B2924] text-xs font-semibold uppercase tracking-wider">
          <Store className="w-3.5 h-3.5 text-[#795548]" />
          TableReserve Hospitality Network
        </div>

        <h1 className="font-serif text-4xl sm:text-6xl font-bold tracking-tight text-[#201B18] max-w-4xl mx-auto leading-tight">
          Exceptional dining operations. <br />
          <span className="italic text-[#795548]">Pre-ordered courses & zero idle tables.</span>
        </h1>

        <p className="text-base sm:text-lg text-[#776B63] max-w-2xl mx-auto leading-relaxed">
          Join top restaurants that eliminate table wait times and culinary kitchen backlogs by combining table reservation availability with pre-ordered courses.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link
            href="/partner/register"
            className="px-8 py-3.5 rounded-xl bg-[#3B2924] hover:bg-[#795548] text-white font-semibold text-xs transition shadow-md flex items-center justify-center gap-2"
          >
            <span>Register Your Restaurant</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/partner/login"
            className="px-8 py-3.5 rounded-xl bg-white border border-[#E6DDD3] hover:bg-[#F8F5F0] text-[#201B18] font-semibold text-xs transition shadow-2xs"
          >
            Owner Console Sign In
          </Link>
        </div>
      </section>

      {/* Core Operational Value Pillars */}
      <section className="bg-white border-y border-[#E6DDD3] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-serif text-3xl font-bold text-[#201B18]">
              Why Leading Chefs & Restaurateurs Partner With Us
            </h2>
            <p className="text-sm text-[#776B63] mt-2">
              Transform table turns, culinary prep predictability, and guest satisfaction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="p-8 rounded-3xl bg-[#F8F5F0] border border-[#E6DDD3] space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#E6DDD3] flex items-center justify-center text-[#795548] shadow-2xs">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#201B18]">
                Advance Kitchen Pacing
              </h3>
              <p className="text-xs text-[#776B63] leading-relaxed">
                Know what dishes, quantities, and prep requirements are scheduled hours in advance. Fire steaks and pastas precisely when guests are seated.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#F8F5F0] border border-[#E6DDD3] space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#E6DDD3] flex items-center justify-center text-[#795548] shadow-2xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#201B18]">
                Real Capacity Integrity
              </h3>
              <p className="text-xs text-[#776B63] leading-relaxed">
                Automated table allocation algorithm prevents overbooking. The engine checks individual table capacity and total seat limit concurrently.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#F8F5F0] border border-[#E6DDD3] space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#E6DDD3] flex items-center justify-center text-[#795548] shadow-2xs">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#201B18]">
                Higher Average Checks
              </h3>
              <p className="text-xs text-[#776B63] leading-relaxed">
                Guests who pre-order explore the full menu without time pressure, leading to significantly higher course adoption, desserts, and beverage pairings.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Step by Step Onboarding */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-serif text-3xl font-bold text-[#201B18]">
            Simple Three-Step Onboarding
          </h2>
          <p className="text-sm text-[#776B63] mt-2">
            Go live with zero disruption to your daily kitchen and dining room rhythm.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <span className="font-serif text-3xl font-bold text-[#795548]">01</span>
            <h4 className="font-serif text-lg font-bold text-[#201B18]">Register Your Venue</h4>
            <p className="text-xs text-[#776B63] leading-relaxed">
              Complete the merchant registration with your seating capacity, floor tables, and service hours.
            </p>
          </div>

          <div className="space-y-3">
            <span className="font-serif text-3xl font-bold text-[#795548]">02</span>
            <h4 className="font-serif text-lg font-bold text-[#201B18]">Upload Your Menu</h4>
            <p className="text-xs text-[#776B63] leading-relaxed">
              Add your culinary categories, signature courses, pricing snapshots, and dietary tags into your private portal.
            </p>
          </div>

          <div className="space-y-3">
            <span className="font-serif text-3xl font-bold text-[#795548]">03</span>
            <h4 className="font-serif text-lg font-bold text-[#201B18]">Receive Pre-Ordered Diners</h4>
            <p className="text-xs text-[#776B63] leading-relaxed">
              Accept verified reservations with locked-in dish orders, check guests in, and deliver unforgettable hospitality.
            </p>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="rounded-3xl bg-[#3B2924] text-white p-8 sm:p-12 text-center space-y-6">
          <h3 className="font-serif text-3xl font-bold">
            Ready to partner with TableReserve?
          </h3>
          <p className="text-xs sm:text-sm text-[#E9DFD2] max-w-lg mx-auto">
            Take control of your dining room occupancy and kitchen throughput today.
          </p>
          <div className="pt-2">
            <Link
              href="/partner/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-[#3B2924] font-semibold text-xs hover:bg-[#F8F5F0] transition shadow-md"
            >
              <span>Get Started as a Restaurant Partner</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}

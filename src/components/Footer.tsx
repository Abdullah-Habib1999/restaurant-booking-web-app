'use client';

import React from 'react';
import Link from 'next/link';
import { UtensilsCrossed, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const { user, isAuthenticated, role } = useAuth();
  const pathname = usePathname();

  // If inside the private owner console, omit the public marketing footer
  const isOwnerRoute = pathname.startsWith('/owner');
  if (isOwnerRoute) {
    return null;
  }

  return (
    <footer className="bg-white border-t border-[#E6DDD3] pt-16 pb-12 mt-24 text-[#201B18]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main 4-column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-14 border-b border-[#E6DDD3]">
          
          {/* Brand Column (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#3B2924] flex items-center justify-center text-[#F8F5F0]">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
              <span className="font-serif text-xl font-bold tracking-tight text-[#201B18]">
                TableReserve
              </span>
            </Link>
            
            <p className="font-serif italic text-sm text-[#795548] font-medium">
              "Exceptional Dining, Thoughtfully Reserved."
            </p>

            <p className="text-xs text-[#776B63] leading-relaxed max-w-sm">
              TableReserve connects discerning diners with renowned restaurants. Reserve verified table availability and pre-order Chef-curated courses so your meals are served immediately upon arrival.
            </p>
          </div>

          {/* Explore Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#3B2924]">
              Explore
            </h4>
            <ul className="space-y-2.5 text-xs text-[#776B63]">
              <li>
                <Link href="/restaurants" className="hover:text-[#201B18] transition">
                  Explore Restaurants
                </Link>
              </li>
              <li>
                <Link href="/my-bookings" className="hover:text-[#201B18] transition">
                  My Bookings
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-[#201B18] transition">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/help" className="hover:text-[#201B18] transition">
                  Help & Support
                </Link>
              </li>
            </ul>
          </div>

          {/* For Restaurant Owners Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#3B2924]">
              For Restaurant Owners
            </h4>
            <ul className="space-y-2.5 text-xs text-[#776B63]">
              <li>
                <Link href="/partner" className="hover:text-[#201B18] transition font-medium flex items-center gap-1 text-[#795548]">
                  Partner With Us
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </li>
              <li>
                <Link href="/partner/register" className="hover:text-[#201B18] transition">
                  Register Your Restaurant
                </Link>
              </li>
              <li>
                <Link href="/partner/login" className="hover:text-[#201B18] transition">
                  Restaurant Owner Login
                </Link>
              </li>
              <li>
                <Link 
                  href={isAuthenticated && role === 'restaurant_owner' ? '/owner/overview' : '/partner/login'} 
                  className="hover:text-[#201B18] transition"
                >
                  Manage Your Restaurant
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#3B2924]">
              Legal & Terms
            </h4>
            <ul className="space-y-2.5 text-xs text-[#776B63]">
              <li>
                <Link href="/privacy" className="hover:text-[#201B18] transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#201B18] transition">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/cancellation-policy" className="hover:text-[#201B18] transition">
                  Booking & Cancellation Policy
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Copyright & Guarantee */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#776B63]">
          <p>© {new Date().getFullYear()} TableReserve Hospitality Technologies Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Verified Table Capacity</span>
            <span>Advance Food Pre-Ordering</span>
            <span>Zero-Wait Dining</span>
          </div>
        </div>

      </div>
    </footer>
  );
}

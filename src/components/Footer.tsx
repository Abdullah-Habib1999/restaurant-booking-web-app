'use client';

import React from 'react';
import Link from 'next/link';
import { UtensilsCrossed, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const { user, isAuthenticated, role } = useAuth();
  const pathname = usePathname();

  // If inside the private owner or admin console, omit the public marketing footer
  const isOwnerRoute = pathname.startsWith('/owner');
  const isAdminRoute = pathname.startsWith('/admin');
  if (isOwnerRoute || isAdminRoute) {
    return null;
  }

  return (
    <footer className="bg-[#0B0B0B] border-t border-[#332A25] pt-16 pb-12 mt-24 text-[#F5F0E9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main 4-column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-14 border-b border-[#332A25]">
          
          {/* Brand Column (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-[#1C1917] border border-[#332A25] flex items-center justify-center text-[#C6A47E] group-hover:border-[#8B5E45] group-hover:bg-[#38251F] group-hover:text-[#F5F0E9] transition-all duration-200">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
              <span className="font-serif text-xl font-bold tracking-tight text-[#F5F0E9]">
                TableReserve
              </span>
            </Link>
            
            <p className="font-serif italic text-sm text-[#C6A47E] font-medium">
              "Exceptional Dining, Thoughtfully Reserved."
            </p>

            <p className="text-xs text-[#B7AAA0] leading-relaxed max-w-sm">
              TableReserve connects discerning diners with renowned restaurants. Reserve verified table availability and pre-order Chef-curated courses so your meals are served immediately upon arrival.
            </p>
          </div>

          {/* Explore Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#F5F0E9]/90">
              Explore
            </h4>
            <ul className="space-y-2.5 text-xs text-[#B7AAA0]">
              <li>
                <Link href="/restaurants" className="hover:text-[#F5F0E9] transition">
                  Explore Restaurants
                </Link>
              </li>
              <li>
                <Link href="/my-bookings" className="hover:text-[#F5F0E9] transition">
                  My Bookings
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-[#F5F0E9] transition">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/help" className="hover:text-[#F5F0E9] transition">
                  Help & Support
                </Link>
              </li>
            </ul>
          </div>

          {/* For Restaurant Owners Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#F5F0E9]/90">
              For Restaurant Owners
            </h4>
            <ul className="space-y-2.5 text-xs text-[#B7AAA0]">
              <li>
                <Link href="/partner" className="hover:text-[#DFC4A5] transition font-medium flex items-center gap-1 text-[#C6A47E]">
                  Partner With Us
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </li>
              <li>
                <Link href="/partner/register" className="hover:text-[#F5F0E9] transition">
                  Register Your Restaurant
                </Link>
              </li>
              <li>
                <Link href="/partner/login" className="hover:text-[#F5F0E9] transition">
                  Restaurant Owner Login
                </Link>
              </li>
              <li>
                <Link 
                  href={isAuthenticated && role === 'restaurant_owner' ? '/owner/overview' : '/partner/login'} 
                  className="hover:text-[#F5F0E9] transition"
                >
                  Manage Your Restaurant
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#F5F0E9]/90">
              Legal & Terms
            </h4>
            <ul className="space-y-2.5 text-xs text-[#B7AAA0]">
              <li>
                <Link href="/privacy" className="hover:text-[#F5F0E9] transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#F5F0E9] transition">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/cancellation-policy" className="hover:text-[#F5F0E9] transition">
                  Booking & Cancellation Policy
                </Link>
              </li>
              <li className="pt-2 border-t border-[#332A25]/60">
                <Link href="/admin" className="text-[#C6A47E] hover:text-[#F5F0E9] transition font-medium flex items-center gap-1 text-[11px]">
                  <span>Super Admin Portal</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Copyright & Guarantee */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8D8178]">
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

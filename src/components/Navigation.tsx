'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  UtensilsCrossed, 
  Calendar, 
  User, 
  Compass, 
  LogIn
} from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const { user, isAuthenticated, role } = useAuth();

  // If inside the private owner console, show the dedicated minimal header
  const isOwnerRoute = pathname.startsWith('/owner');
  if (isOwnerRoute) {
    return null; // The owner layout has its own sidebar & header
  }

  return (
    <header className="sticky top-0 z-50 bg-[#F8F5F0]/95 backdrop-blur-md border-b border-[#E6DDD3] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Platform Name */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#3B2924] flex items-center justify-center text-[#F8F5F0] shadow-sm group-hover:bg-[#795548] transition-colors">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <span className="font-serif text-xl font-bold tracking-tight text-[#201B18]">
                TableReserve
              </span>
              <span className="block text-[10px] uppercase tracking-wider text-[#795548] font-medium">
                Fine Dining & Pre-Orders
              </span>
            </div>
          </Link>

          {/* Center Navigation Links - Clean, Customer Focused */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/restaurants"
              className={`px-4 py-2 rounded-xl text-xs uppercase tracking-wider font-semibold transition-colors ${
                pathname === '/restaurants' 
                  ? 'bg-[#E9DFD2] text-[#201B18]' 
                  : 'text-[#776B63] hover:text-[#201B18] hover:bg-[#E9DFD2]/40'
              }`}
            >
              <span className="flex items-center gap-2">
                <Compass className="w-3.5 h-3.5" />
                Explore Restaurants
              </span>
            </Link>

            {isAuthenticated && role === 'customer' && (
              <Link
                href="/my-bookings"
                className={`px-4 py-2 rounded-xl text-xs uppercase tracking-wider font-semibold transition-colors ${
                  pathname === '/my-bookings'
                    ? 'bg-[#E9DFD2] text-[#201B18]'
                    : 'text-[#776B63] hover:text-[#201B18] hover:bg-[#E9DFD2]/40'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  My Bookings
                </span>
              </Link>
            )}
          </nav>

          {/* Right Action: Clean Account / Login */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/profile"
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-[#E6DDD3] bg-white hover:bg-[#FAF9F6] transition shadow-2xs"
                  title="My Account"
                >
                  <div className="w-7 h-7 rounded-full bg-[#3B2924] text-[#F8F5F0] flex items-center justify-center font-medium text-xs">
                    {user?.fullName ? user.fullName[0].toUpperCase() : <User className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-xs font-semibold text-[#201B18] hidden sm:inline max-w-[120px] truncate">
                    {user?.fullName?.split(' ')[0]}
                  </span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-xl border border-[#E6DDD3] bg-white hover:bg-[#FAF9F6] text-xs font-semibold text-[#3B2924] transition flex items-center gap-1.5 shadow-2xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/register"
                  className="hidden sm:inline-flex px-4 py-2 rounded-xl bg-[#3B2924] hover:bg-[#795548] text-white text-xs font-semibold transition shadow-xs"
                >
                  Join
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}

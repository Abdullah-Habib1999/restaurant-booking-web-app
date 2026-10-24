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
  LogIn,
  ShieldCheck
} from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const { user, isAuthenticated, role } = useAuth();

  // If inside the private owner or admin console, hide the public header
  const isOwnerRoute = pathname.startsWith('/owner');
  const isAdminRoute = pathname.startsWith('/admin');
  if (isOwnerRoute || isAdminRoute) {
    return null; // Layout has its own sidebar & header
  }

  return (
    <header className="sticky top-0 z-50 bg-[#0B0B0B]/95 backdrop-blur-md border-b border-[#332A25] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Platform Name */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#1C1917] border border-[#332A25] flex items-center justify-center text-[#C6A47E] shadow-sm group-hover:border-[#8B5E45] group-hover:text-[#F5F0E9] group-hover:bg-[#38251F] transition-all duration-200">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <span className="font-serif text-xl font-bold tracking-tight text-[#F5F0E9] group-hover:text-[#C6A47E] transition-colors">
                TableReserve
              </span>
              <span className="block text-[10px] uppercase tracking-widest text-[#C6A47E] font-medium">
                Fine Dining & Pre-Orders
              </span>
            </div>
          </Link>

          {/* Center Navigation Links - Clean, Customer Focused */}
          <nav className="hidden md:flex items-center space-x-1.5">
            <Link
              href="/restaurants"
              className={`px-4 py-2 rounded-xl text-xs uppercase tracking-wider font-semibold transition-all duration-200 ${
                pathname === '/restaurants' 
                  ? 'bg-[#38251F] text-[#F5F0E9] border border-[#54372D] shadow-xs' 
                  : 'text-[#B7AAA0] hover:text-[#F5F0E9] hover:bg-[#1C1917] border border-transparent'
              }`}
            >
              <span className="flex items-center gap-2">
                <Compass className="w-3.5 h-3.5 text-[#C6A47E]" />
                Explore Restaurants
              </span>
            </Link>

            {isAuthenticated && role === 'customer' && (
              <Link
                href="/my-bookings"
                className={`px-4 py-2 rounded-xl text-xs uppercase tracking-wider font-semibold transition-all duration-200 ${
                  pathname === '/my-bookings'
                    ? 'bg-[#38251F] text-[#F5F0E9] border border-[#54372D] shadow-xs'
                    : 'text-[#B7AAA0] hover:text-[#F5F0E9] hover:bg-[#1C1917] border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-[#C6A47E]" />
                  My Bookings
                </span>
              </Link>
            )}
          </nav>

          {/* Right Action: Clean Account / Login */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {role === 'admin' && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/30 transition shadow-xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin</span>
                  </Link>
                )}
                <Link
                  href="/profile"
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-[#332A25] bg-[#181513] hover:bg-[#1C1917] hover:border-[#54372D] transition shadow-xs"
                  title="My Account"
                >
                  <div className="w-7 h-7 rounded-full bg-[#38251F] border border-[#54372D] text-[#C6A47E] flex items-center justify-center font-medium text-xs">
                    {user?.fullName ? user.fullName[0].toUpperCase() : <User className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-xs font-semibold text-[#F5F0E9] hidden sm:inline max-w-[120px] truncate">
                    {user?.fullName?.split(' ')[0]}
                  </span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-xl border border-[#332A25] bg-[#181513] hover:bg-[#1C1917] hover:border-[#54372D] text-xs font-semibold text-[#F5F0E9] transition flex items-center gap-1.5 shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#C6A47E]" />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/register"
                  className="hidden sm:inline-flex px-4 py-2 rounded-xl bg-[#8B5E45] hover:bg-[#9E6C51] text-[#F5F0E9] text-xs font-semibold transition shadow-xs border border-[#8B5E45]/60"
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

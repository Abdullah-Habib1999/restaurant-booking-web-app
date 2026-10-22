'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  Calendar, 
  Grid3X3, 
  UtensilsCrossed, 
  Settings, 
  Store,
  ExternalLink,
  LogOut,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/db';
import { Restaurant } from '@/types';

const NAV_ITEMS = [
  { href: '/owner/overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/owner/reservations', label: 'Reservations & Pre-Orders', icon: BookOpen },
  { href: '/owner/tables', label: 'Tables & Capacity Engine', icon: Grid3X3 },
  { href: '/owner/menu', label: 'Menu Management', icon: UtensilsCrossed },
  { href: '/owner/profile', label: 'Restaurant Profile', icon: Store },
  { href: '/owner/settings', label: 'Settings & Hours', icon: Settings },
];

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, role, logout } = useAuth();
  const [activeRestaurant, setActiveRestaurant] = useState<Restaurant | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    // If not authenticated or not an owner, redirect appropriately
    if (!isAuthenticated) {
      router.push('/partner/login');
      return;
    }
    if (role !== 'restaurant_owner' && role !== 'admin') {
      router.push('/');
      return;
    }

    const loadRestaurant = async () => {
      // Find restaurant owned by this user, or fallback to first owned restaurant
      const targetId = user?.ownedRestaurantId || 'rest-1';
      const rest = await db.getRestaurantById(targetId);
      if (rest) {
        setActiveRestaurant(rest);
      }
      setIsVerifying(false);
    };
    loadRestaurant();
  }, [user, isAuthenticated, role, router]);

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#F8F5F0] flex items-center justify-center text-xs text-[#776B63]">
        Verifying restaurant merchant credentials...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F5F0] flex flex-col md:flex-row">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-white border-r border-[#E6DDD3] p-6 shrink-0 flex flex-col justify-between shadow-2xs">
        <div className="space-y-6">
          
          {/* Header */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#795548]">
              Merchant Console
            </span>
            <h2 className="font-serif text-lg font-bold text-[#201B18] truncate" title={activeRestaurant?.name}>
              {activeRestaurant?.name || 'Restaurant Dashboard'}
            </h2>
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className={`w-2 h-2 rounded-full ${activeRestaurant?.status === 'published' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-[11px] text-[#776B63] capitalize">
                {activeRestaurant?.status ? activeRestaurant.status.replace('_', ' ') : 'Active'}
              </span>
            </div>
            <p className="text-[11px] text-[#776B63] pt-1">
              Host: <span className="text-[#201B18] font-medium">{user?.fullName}</span>
            </p>
          </div>

          {/* Links */}
          <nav className="space-y-1">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#3B2924] text-white shadow-xs'
                      : 'text-[#776B63] hover:text-[#201B18] hover:bg-[#F8F5F0]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

        </div>

        {/* Bottom Actions */}
        <div className="pt-6 border-t border-[#E6DDD3] mt-6 space-y-2">
          {activeRestaurant?.slug && (
            <Link
              href={`/restaurants/${activeRestaurant.slug}`}
              target="_blank"
              className="flex items-center justify-between text-xs text-[#795548] hover:text-[#3B2924] font-semibold py-2 px-3 rounded-xl bg-[#F8F5F0] border border-[#E6DDD3] transition"
            >
              <span>Live Diner View</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}

          <button
            type="button"
            onClick={() => {
              logout();
              router.push('/partner/login');
            }}
            className="w-full flex items-center justify-between text-xs text-[#776B63] hover:text-red-700 py-2 px-3 rounded-xl hover:bg-red-50 transition cursor-pointer"
          >
            <span>Sign Out</span>
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 sm:p-8 lg:p-10 max-w-7xl overflow-x-hidden">
        {children}
      </main>

    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Clock, 
  Store, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  LogOut, 
  ExternalLink,
  Lock,
  ArrowLeft
} from 'lucide-react';
import { adminAuth, adminApi, AdminStats } from '@/lib/adminApi';
import { UserProfile } from '@/types';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);

  const isPublicAdminRoute = pathname === '/admin/login' || pathname === '/admin/setup';

  useEffect(() => {
    if (isPublicAdminRoute) {
      setIsLoading(false);
      return;
    }

    const verify = async () => {
      try {
        // First check if an admin even exists
        const status = await adminApi.checkStatus();
        if (!status.hasAdmin) {
          router.push('/admin/setup');
          return;
        }

        const stored = adminAuth.getStoredAdmin();
        if (!stored || stored.role !== 'admin') {
          router.push('/admin/login');
          return;
        }

        const res = await adminApi.verifySession();
        if (!res.authenticated || !res.admin) {
          adminAuth.clearStoredAdmin();
          router.push('/admin/login');
          return;
        }

        setAdmin(res.admin);

        // Fetch quick stats for badge counts
        const statsData = await adminApi.getStats().catch(() => null);
        if (statsData) setStats(statsData);
      } catch (err) {
        console.warn('Admin layout verification failed:', err);
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    verify();
  }, [pathname, isPublicAdminRoute, router]);

  if (isPublicAdminRoute) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex flex-col items-center justify-center text-[#F5F0E9] space-y-3">
        <div className="w-8 h-8 border-2 border-[#C6A47E] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs uppercase tracking-widest text-[#C6A47E]">Verifying Super Admin Credentials...</span>
      </div>
    );
  }

  const NAV_ITEMS = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { 
      href: '/admin/pending', 
      label: 'Pending Approvals', 
      icon: Clock, 
      badge: stats?.pendingApprovals ? stats.pendingApprovals : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    },
    { href: '/admin/restaurants', label: 'All Restaurants', icon: Store, count: stats?.totalRestaurants },
    { href: '/admin/approved', label: 'Approved Restaurants', icon: CheckCircle2, count: stats?.approvedRestaurants },
    { href: '/admin/rejected', label: 'Rejected Registrations', icon: XCircle, count: stats?.rejectedRegistrations },
    { href: '/admin/suspended', label: 'Suspended Restaurants', icon: AlertTriangle, count: stats?.suspendedRestaurants }
  ];

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-[#F5F0E9] flex flex-col md:flex-row antialiased">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-72 bg-[#141210] border-r border-[#332A25] p-6 shrink-0 flex flex-col justify-between shadow-2xl">
        <div className="space-y-6">
          
          {/* Logo & Portal Identity */}
          <div className="space-y-2 pb-4 border-b border-[#332A25]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#38251F] border border-[#54372D] flex items-center justify-center text-[#C6A47E] shadow-inner">
                <ShieldCheck className="w-5 h-5 text-[#C6A47E]" />
              </div>
              <div>
                <span className="font-serif text-base font-bold text-[#F5F0E9] tracking-tight block">
                  TableReserve
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#C6A47E]">
                  Super Admin Console
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-[#8D8178]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Production Security Guard Active</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#38251F] text-[#F5F0E9] border border-[#54372D] shadow-sm'
                      : 'text-[#B7AAA0] hover:text-[#F5F0E9] hover:bg-[#1C1917]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#C6A47E]' : 'text-[#8D8178]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.badgeColor || 'bg-[#38251F] text-[#C6A47E]'}`}>
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && item.badge === undefined && (
                    <span className="text-[10px] text-[#8D8178]">
                      {item.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

        </div>

        {/* Bottom: Admin Profile & Actions */}
        <div className="pt-6 border-t border-[#332A25] mt-6 space-y-3">
          
          {/* Admin Identity Card */}
          <div className="p-3 rounded-xl bg-[#181513] border border-[#332A25]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#38251F] border border-[#54372D] flex items-center justify-center font-bold text-xs text-[#C6A47E]">
                {admin?.fullName ? admin.fullName[0].toUpperCase() : 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-[#F5F0E9] truncate">
                  {admin?.fullName || 'Super Administrator'}
                </div>
                <div className="text-[10px] text-[#8D8178] truncate">
                  {admin?.email}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/"
              target="_blank"
              className="flex items-center justify-center gap-1.5 text-[11px] text-[#C6A47E] hover:text-[#F5F0E9] font-medium py-2 px-2.5 rounded-lg bg-[#181513] border border-[#332A25] hover:bg-[#38251F] transition text-center"
            >
              <span>Public Site</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            <button
              type="button"
              onClick={() => {
                adminAuth.clearStoredAdmin();
                router.push('/admin/login');
              }}
              className="flex items-center justify-center gap-1.5 text-[11px] text-[#8D8178] hover:text-rose-400 font-medium py-2 px-2.5 rounded-lg bg-[#181513] border border-[#332A25] hover:bg-rose-950/20 transition cursor-pointer text-center"
            >
              <span>Sign Out</span>
              <LogOut className="w-3 h-3" />
            </button>
          </div>

        </div>

      </aside>

      {/* MAIN CONTENT WORKSPACE */}
      <main className="flex-1 p-4 sm:p-8 lg:p-10 max-w-7xl overflow-x-hidden">
        {children}
      </main>

    </div>
  );
}

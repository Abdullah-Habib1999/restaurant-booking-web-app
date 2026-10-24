'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Store, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Calendar, 
  ArrowRight, 
  ShieldCheck, 
  Database, 
  Server, 
  Users, 
  MapPin, 
  ExternalLink,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { adminApi, AdminStats, AdminRestaurantItem } from '@/lib/adminApi';
import AdminActionModal, { AdminActionType } from '@/components/admin/AdminActionModal';

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingRestaurants, setPendingRestaurants] = useState<AdminRestaurantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalAction, setModalAction] = useState<AdminActionType | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<AdminRestaurantItem | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    try {
      const [statsData, pendingData] = await Promise.all([
        adminApi.getStats(),
        adminApi.getRestaurants({ status: 'pending_approval' })
      ]);
      setStats(statsData);
      setPendingRestaurants(pendingData);
    } catch (err) {
      console.error('Failed to load admin overview data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleOpenModal = (action: AdminActionType, rest: AdminRestaurantItem) => {
    setSelectedRestaurant(rest);
    setModalAction(action);
  };

  const handleConfirmAction = async (restaurantId: string, reason?: string) => {
    if (!modalAction) return;

    if (modalAction === 'approve') {
      const res = await adminApi.approveRestaurant(restaurantId);
      setFeedback({ type: 'success', message: res.message });
    } else if (modalAction === 'reject') {
      const res = await adminApi.rejectRestaurant(restaurantId, reason || '');
      setFeedback({ type: 'success', message: res.message });
    }

    // Refresh data
    await loadData();
    setTimeout(() => setFeedback(null), 4000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="w-8 h-8 border-2 border-[#C6A47E] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs uppercase tracking-widest text-[#C6A47E]">Loading Platform Overview...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in text-[#F5F0E9]">
      
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#332A25]">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#C6A47E]">
            TableReserve Governance Engine
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#F5F0E9] tracking-tight">
            Super Admin Overview
          </h1>
          <p className="text-xs text-[#8D8178] mt-1">
            Global management of restaurant registrations, approval status, and production availability.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#181513] border border-[#332A25] hover:bg-[#38251F] text-xs font-semibold text-[#B7AAA0] hover:text-[#F5F0E9] transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#C6A47E] ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/admin/pending"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8B5E45] hover:bg-[#9E6C51] text-xs font-semibold text-[#F5F0E9] transition shadow-md"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Approvals ({stats?.pendingApprovals || 0})</span>
          </Link>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
          feedback.type === 'success' 
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200' 
            : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
        }`}>
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-xs underline ml-4 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* METRICS KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4">
        
        {/* Pending Approvals (High Priority) */}
        <Link
          href="/admin/pending"
          className="p-4 rounded-2xl bg-[#1C1917] border border-amber-500/40 hover:border-amber-400 transition-all shadow-lg group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Pending
            </span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-serif text-2xl font-bold text-[#F5F0E9]">
            {stats?.pendingApprovals ?? 0}
          </div>
          <span className="text-[11px] text-[#8D8178] block pt-1">
            Requires Review &rarr;
          </span>
        </Link>

        {/* Total Restaurants */}
        <Link
          href="/admin/restaurants"
          className="p-4 rounded-2xl bg-[#181513] border border-[#332A25] hover:border-[#54372D] transition-all shadow-md group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#C6A47E]">
              Total Venues
            </span>
            <Store className="w-4 h-4 text-[#8D8178] group-hover:text-[#C6A47E] transition" />
          </div>
          <div className="font-serif text-2xl font-bold text-[#F5F0E9]">
            {stats?.totalRestaurants ?? 0}
          </div>
          <span className="text-[11px] text-[#8D8178] block pt-1">
            Registered Venues
          </span>
        </Link>

        {/* Approved / Published */}
        <Link
          href="/admin/approved"
          className="p-4 rounded-2xl bg-[#181513] border border-[#332A25] hover:border-emerald-500/40 transition-all shadow-md group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Approved
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-serif text-2xl font-bold text-[#F5F0E9]">
            {stats?.approvedRestaurants ?? 0}
          </div>
          <span className="text-[11px] text-[#8D8178] block pt-1">
            Live & Bookable
          </span>
        </Link>

        {/* Rejected Registrations */}
        <Link
          href="/admin/rejected"
          className="p-4 rounded-2xl bg-[#181513] border border-[#332A25] hover:border-rose-500/40 transition-all shadow-md group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
              Rejected
            </span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="font-serif text-2xl font-bold text-[#F5F0E9]">
            {stats?.rejectedRegistrations ?? 0}
          </div>
          <span className="text-[11px] text-[#8D8178] block pt-1">
            Rejected Partners
          </span>
        </Link>

        {/* Suspended Restaurants */}
        <Link
          href="/admin/suspended"
          className="p-4 rounded-2xl bg-[#181513] border border-[#332A25] hover:border-amber-500/40 transition-all shadow-md group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
              Suspended
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-300" />
          </div>
          <div className="font-serif text-2xl font-bold text-[#F5F0E9]">
            {stats?.suspendedRestaurants ?? 0}
          </div>
          <span className="text-[11px] text-[#8D8178] block pt-1">
            Temporarily Paused
          </span>
        </Link>

        {/* Total Reservations */}
        <div className="p-4 rounded-2xl bg-[#181513] border border-[#332A25] shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#C6A47E]">
              Reservations
            </span>
            <Calendar className="w-4 h-4 text-[#8D8178]" />
          </div>
          <div className="font-serif text-2xl font-bold text-[#F5F0E9]">
            {stats?.totalReservations ?? 0}
          </div>
          <span className="text-[11px] text-[#8D8178] block pt-1">
            Across Platform
          </span>
        </div>

      </div>

      {/* ACTION REQUIRED: PENDING REGISTRATIONS QUEUE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <h2 className="font-serif text-lg font-bold text-[#F5F0E9]">
              Pending Approval Queue
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {pendingRestaurants.length} Awaiting Review
            </span>
          </div>

          <Link
            href="/admin/pending"
            className="text-xs text-[#C6A47E] hover:text-[#F5F0E9] font-medium flex items-center gap-1 transition"
          >
            <span>View Full Pending Queue</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {pendingRestaurants.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#181513] border border-[#332A25] text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <div className="font-serif text-base font-bold text-[#F5F0E9]">
              All Caught Up!
            </div>
            <p className="text-xs text-[#8D8178] max-w-sm mx-auto">
              There are no pending restaurant registrations awaiting admin review. Newly registered restaurants will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#332A25] bg-[#181513]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#332A25] bg-[#141210] text-[#8D8178] uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 font-semibold">Restaurant</th>
                  <th className="py-3.5 px-4 font-semibold">Applicant / Owner</th>
                  <th className="py-3.5 px-4 font-semibold">Location</th>
                  <th className="py-3.5 px-4 font-semibold">Capacity</th>
                  <th className="py-3.5 px-4 font-semibold">Submitted</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#332A25]">
                {pendingRestaurants.map((rest) => (
                  <tr key={rest.id} className="hover:bg-[#1C1917] transition-colors">
                    
                    {/* Restaurant */}
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="font-semibold text-[#F5F0E9] text-sm">{rest.name}</div>
                        <div className="text-[11px] text-[#C6A47E] font-medium">
                          {rest.priceTier} &bull; {rest.cuisineType?.slice(0, 2).join(', ')}
                        </div>
                      </div>
                    </td>

                    {/* Owner */}
                    <td className="py-3.5 px-4">
                      <div className="text-[#F5F0E9] font-medium">{rest.owner?.fullName || 'Partner Host'}</div>
                      <div className="text-[11px] text-[#8D8178]">{rest.owner?.email || rest.email}</div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-[#B7AAA0]">
                        <MapPin className="w-3.5 h-3.5 text-[#C6A47E] shrink-0" />
                        <span className="truncate max-w-[140px]">{rest.city}</span>
                      </div>
                    </td>

                    {/* Capacity */}
                    <td className="py-3.5 px-4 text-[#B7AAA0]">
                      <div>{rest.totalSeatingCapacity} seats</div>
                      <div className="text-[10px] text-[#8D8178]">{rest.tableCount || 0} tables</div>
                    </td>

                    {/* Submitted Date */}
                    <td className="py-3.5 px-4 text-[#8D8178] text-[11px]">
                      {new Date(rest.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenModal('approve', rest)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white text-xs font-semibold transition cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenModal('reject', rest)}
                          className="px-3 py-1.5 rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600 hover:text-white text-xs font-semibold transition cursor-pointer"
                        >
                          Reject
                        </button>
                        <Link
                          href={`/admin/pending?id=${rest.id}`}
                          className="p-1.5 rounded-lg text-[#8D8178] hover:text-[#F5F0E9] hover:bg-[#38251F] transition"
                          title="Inspect application"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PLATFORM SECURITY & PERSISTENCE ARCHITECTURE CARD */}
      <div className="p-6 rounded-2xl bg-[#141210] border border-[#332A25] space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#38251F] border border-[#54372D] flex items-center justify-center text-[#C6A47E]">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-[#F5F0E9]">
              Production Architecture & Serverless Persistence
            </h3>
            <p className="text-xs text-[#8D8178]">
              Verified SQLite WAL database with memory mirror backup across Netlify serverless invocations.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
          
          <div className="p-3.5 rounded-xl bg-[#1C1917] border border-[#332A25] space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-[11px]">
              <Server className="w-3.5 h-3.5" />
              <span>Database Storage Mode</span>
            </div>
            <p className="text-[#B7AAA0] text-[11px] leading-relaxed">
              Persisted with SQLite WAL mode. On Netlify serverless functions, stores in ephemeral resilient storage with persistent zero-downtime memory mirror.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#1C1917] border border-[#332A25] space-y-1">
            <div className="flex items-center gap-2 text-[#C6A47E] font-semibold text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Super Admin Bootstrap Status</span>
            </div>
            <p className="text-[#B7AAA0] text-[11px] leading-relaxed">
              Initial admin setup is strictly locked down on the server. Unauthorized users cannot elevate privileges or re-run initialization.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#1C1917] border border-[#332A25] space-y-1">
            <div className="flex items-center gap-2 text-amber-300 font-semibold text-[11px]">
              <Store className="w-3.5 h-3.5" />
              <span>Approval Rule Enforcement</span>
            </div>
            <p className="text-[#B7AAA0] text-[11px] leading-relaxed">
              Public listings and booking slots strictly block pending, rejected, and suspended venues at the server API level.
            </p>
          </div>

        </div>
      </div>

      {/* Confirmation & Review Modal */}
      <AdminActionModal
        isOpen={Boolean(modalAction)}
        action={modalAction}
        restaurant={selectedRestaurant}
        onClose={() => {
          setModalAction(null);
          setSelectedRestaurant(null);
        }}
        onConfirm={handleConfirmAction}
      />

    </div>
  );
}

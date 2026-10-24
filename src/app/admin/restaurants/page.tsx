'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Store, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  User, 
  ExternalLink,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { adminApi, AdminRestaurantItem } from '@/lib/adminApi';
import AdminActionModal, { AdminActionType } from '@/components/admin/AdminActionModal';
import { RestaurantStatus } from '@/types';

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<AdminRestaurantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal State
  const [modalAction, setModalAction] = useState<AdminActionType | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<AdminRestaurantItem | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getRestaurants({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchTerm.trim() || undefined
      });
      setRestaurants(data);
    } catch (err: any) {
      console.error('Failed to load restaurants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRestaurants();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadRestaurants();
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
    } else if (modalAction === 'suspend') {
      const res = await adminApi.suspendRestaurant(restaurantId, reason || '');
      setFeedback({ type: 'success', message: res.message });
    } else if (modalAction === 'reactivate') {
      const res = await adminApi.reactivateRestaurant(restaurantId);
      setFeedback({ type: 'success', message: res.message });
    }

    await loadRestaurants();
    setTimeout(() => setFeedback(null), 4000);
  };

  const getStatusBadge = (status: RestaurantStatus) => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Approved & Live
          </span>
        );
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Pending Review
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Rejected
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-700/30 text-amber-200 border border-amber-600/40">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Suspended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
            {status}
          </span>
        );
    }
  };

  const FILTER_TABS = [
    { id: 'all', label: 'All Registrations' },
    { id: 'pending_approval', label: 'Pending Approvals' },
    { id: 'published', label: 'Approved & Live' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'suspended', label: 'Suspended' }
  ];

  return (
    <div className="space-y-6 animate-fade-in text-[#F5F0E9]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#332A25]">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#C6A47E]">
            Master Venue Ledger
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#F5F0E9] tracking-tight">
            All Registered Restaurants
          </h1>
          <p className="text-xs text-[#8D8178] mt-1">
            Global repository of restaurant listings across all approval lifecycles.
          </p>
        </div>

        <button
          type="button"
          onClick={loadRestaurants}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#181513] border border-[#332A25] hover:bg-[#38251F] text-xs font-semibold text-[#B7AAA0] hover:text-[#F5F0E9] transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#C6A47E]" />
          <span>Refresh Ledger</span>
        </button>
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

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#141210] border border-[#332A25]">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#38251F] text-[#F5F0E9] border border-[#54372D] shadow-xs'
                  : 'text-[#8D8178] hover:text-[#F5F0E9]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="w-full md:w-72 relative">
          <Search className="w-4 h-4 text-[#8D8178] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search name, city, owner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#181513] border border-[#332A25] text-xs text-[#F5F0E9] placeholder-[#554D47] focus:outline-none focus:border-[#C6A47E] transition"
          />
        </form>

      </div>

      {/* Ledger Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-3">
          <div className="w-8 h-8 border-2 border-[#C6A47E] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs uppercase tracking-widest text-[#C6A47E]">Loading Restaurant Ledger...</span>
        </div>
      ) : restaurants.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#181513] border border-[#332A25] text-center space-y-2">
          <Store className="w-8 h-8 text-[#8D8178] mx-auto" />
          <h3 className="font-serif text-base font-bold text-[#F5F0E9]">
            No Restaurants Found
          </h3>
          <p className="text-xs text-[#8D8178] max-w-sm mx-auto">
            No restaurants matched the current status filter &quot;{statusFilter}&quot; or search query.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#332A25] bg-[#181513] shadow-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#332A25] bg-[#141210] text-[#8D8178] uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4 font-semibold">Restaurant Venue</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Owner Contact</th>
                <th className="py-3.5 px-4 font-semibold">City & Capacity</th>
                <th className="py-3.5 px-4 font-semibold">Audit Record</th>
                <th className="py-3.5 px-4 font-semibold text-right">Governance Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#332A25]">
              {restaurants.map((rest) => (
                <tr key={rest.id} className="hover:bg-[#1C1917] transition-colors">
                  
                  {/* Restaurant Info */}
                  <td className="py-3.5 px-4">
                    <div>
                      <div className="font-semibold text-[#F5F0E9] text-sm flex items-center gap-2">
                        <span>{rest.name}</span>
                        {rest.status === 'published' && (
                          <Link
                            href={`/restaurants/${rest.slug}`}
                            target="_blank"
                            className="text-[#8D8178] hover:text-[#C6A47E] transition"
                            title="Live Diner View"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                      <div className="text-[11px] text-[#C6A47E] font-medium">
                        {rest.priceTier} &bull; {rest.cuisineType?.join(', ')}
                      </div>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4">
                    {getStatusBadge(rest.status)}
                  </td>

                  {/* Owner */}
                  <td className="py-3.5 px-4">
                    <div className="text-[#F5F0E9] font-medium">{rest.owner?.fullName || 'Partner Host'}</div>
                    <div className="text-[11px] text-[#8D8178]">{rest.owner?.email || rest.email}</div>
                  </td>

                  {/* City & Capacity */}
                  <td className="py-3.5 px-4 text-[#B7AAA0]">
                    <div className="font-medium text-[#F5F0E9]">{rest.city}</div>
                    <div className="text-[11px] text-[#8D8178]">
                      {rest.totalSeatingCapacity} seats &bull; {rest.tableCount || 0} tables
                    </div>
                  </td>

                  {/* Audit Record */}
                  <td className="py-3.5 px-4 text-[11px] text-[#8D8178]">
                    {rest.status === 'rejected' && rest.rejectionReason && (
                      <div className="text-rose-300 max-w-xs truncate" title={rest.rejectionReason}>
                        Reason: {rest.rejectionReason}
                      </div>
                    )}
                    {rest.status === 'suspended' && rest.suspendedReason && (
                      <div className="text-amber-300 max-w-xs truncate" title={rest.suspendedReason}>
                        Reason: {rest.suspendedReason}
                      </div>
                    )}
                    <div>
                      Registered: {new Date(rest.createdAt).toLocaleDateString()}
                    </div>
                  </td>

                  {/* Governance Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      
                      {/* If Pending: Approve / Reject */}
                      {rest.status === 'pending_approval' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenModal('approve', rest)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white text-xs font-semibold transition cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenModal('reject', rest)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600 hover:text-white text-xs font-semibold transition cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {/* If Published: Suspend */}
                      {rest.status === 'published' && (
                        <button
                          type="button"
                          onClick={() => handleOpenModal('suspend', rest)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-600 hover:text-white text-xs font-semibold transition cursor-pointer"
                        >
                          Suspend
                        </button>
                      )}

                      {/* If Suspended: Reactivate */}
                      {rest.status === 'suspended' && (
                        <button
                          type="button"
                          onClick={() => handleOpenModal('reactivate', rest)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white text-xs font-semibold transition cursor-pointer"
                        >
                          Reactivate
                        </button>
                      )}

                      {/* If Rejected: Re-evaluate & Approve */}
                      {rest.status === 'rejected' && (
                        <button
                          type="button"
                          onClick={() => handleOpenModal('approve', rest)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#38251F] text-[#C6A47E] border border-[#54372D] hover:bg-[#8B5E45] hover:text-[#F5F0E9] text-xs font-semibold transition cursor-pointer"
                        >
                          Re-evaluate & Approve
                        </button>
                      )}

                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  Store, 
  MapPin, 
  ExternalLink, 
  AlertTriangle, 
  Search, 
  Star,
  Users,
  Clock
} from 'lucide-react';
import { adminApi, AdminRestaurantItem } from '@/lib/adminApi';
import AdminActionModal, { AdminActionType } from '@/components/admin/AdminActionModal';

export default function AdminApprovedPage() {
  const [restaurants, setRestaurants] = useState<AdminRestaurantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [modalAction, setModalAction] = useState<AdminActionType | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<AdminRestaurantItem | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadApproved = async () => {
    try {
      const data = await adminApi.getRestaurants({ status: 'published' });
      setRestaurants(data);
    } catch (err: any) {
      console.error('Failed to load approved restaurants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApproved();
  }, []);

  const handleOpenModal = (action: AdminActionType, rest: AdminRestaurantItem) => {
    setSelectedRestaurant(rest);
    setModalAction(action);
  };

  const handleConfirmAction = async (restaurantId: string, reason?: string) => {
    if (!modalAction) return;

    if (modalAction === 'suspend') {
      const res = await adminApi.suspendRestaurant(restaurantId, reason || '');
      setFeedback({ type: 'success', message: res.message });
    }

    await loadApproved();
    setTimeout(() => setFeedback(null), 4000);
  };

  const filtered = restaurants.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.owner?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="w-8 h-8 border-2 border-[#C6A47E] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs uppercase tracking-widest text-[#C6A47E]">Loading Approved Venues...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-[#F5F0E9]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#332A25]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Active Directory
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#F5F0E9] tracking-tight">
            Approved Restaurants ({restaurants.length})
          </h1>
          <p className="text-xs text-[#8D8178] mt-1">
            Venues that are fully vetted, publicly displayed in search results, and accepting table reservations.
          </p>
        </div>

        {/* Search */}
        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 text-[#8D8178] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search approved venues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#181513] border border-[#332A25] text-xs text-[#F5F0E9] placeholder-[#554D47] focus:outline-none focus:border-[#C6A47E] transition"
          />
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

      {/* Grid of Approved Restaurants */}
      {filtered.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#181513] border border-[#332A25] text-center space-y-2">
          <Store className="w-8 h-8 text-[#8D8178] mx-auto" />
          <h3 className="font-serif text-base font-bold text-[#F5F0E9]">
            No Approved Restaurants Found
          </h3>
          <p className="text-xs text-[#8D8178] max-w-sm mx-auto">
            {restaurants.length === 0 ? 'No restaurants are currently approved. Review pending applications.' : 'No venues matched your search.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(rest => (
            <div
              key={rest.id}
              className="p-5 rounded-2xl bg-[#181513] border border-[#332A25] hover:border-[#54372D] transition-all flex flex-col justify-between space-y-4 shadow-lg group"
            >
              
              {/* Top Details */}
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-serif text-base font-bold text-[#F5F0E9] group-hover:text-[#C6A47E] transition truncate">
                      {rest.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-[#8D8178] pt-0.5">
                      <span className="text-[#C6A47E] font-medium">{rest.priceTier}</span>
                      <span>&bull;</span>
                      <span className="truncate">{rest.cuisineType?.join(', ')}</span>
                    </div>
                  </div>

                  <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live
                  </span>
                </div>

                <p className="text-xs text-[#B7AAA0] line-clamp-2 leading-relaxed">
                  {rest.tagline || rest.description}
                </p>

                <div className="space-y-1.5 pt-1 text-xs text-[#8D8178]">
                  <div className="flex items-center gap-1.5 text-[#B7AAA0]">
                    <MapPin className="w-3.5 h-3.5 text-[#C6A47E] shrink-0" />
                    <span className="truncate">{rest.city}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#C6A47E] shrink-0" />
                    <span>Host: {rest.owner?.fullName || rest.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#C6A47E] shrink-0" />
                    <span>Capacity: {rest.totalSeatingCapacity} seats ({rest.tableCount || 0} tables)</span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-[#332A25] flex items-center justify-between gap-2">
                <Link
                  href={`/restaurants/${rest.slug}`}
                  target="_blank"
                  className="flex items-center gap-1.5 text-xs text-[#C6A47E] hover:text-[#F5F0E9] font-medium transition"
                >
                  <span>Diner Page</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>

                <button
                  type="button"
                  onClick={() => handleOpenModal('suspend', rest)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-600 hover:text-white text-xs font-semibold transition cursor-pointer"
                >
                  Suspend Venue
                </button>
              </div>

            </div>
          ))}
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

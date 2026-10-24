'use client';

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Store, 
  MapPin, 
  User, 
  Search, 
  CheckCircle2, 
  Clock, 
  ShieldAlert
} from 'lucide-react';
import { adminApi, AdminRestaurantItem } from '@/lib/adminApi';
import AdminActionModal, { AdminActionType } from '@/components/admin/AdminActionModal';

export default function AdminSuspendedPage() {
  const [restaurants, setRestaurants] = useState<AdminRestaurantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [modalAction, setModalAction] = useState<AdminActionType | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<AdminRestaurantItem | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadSuspended = async () => {
    try {
      const data = await adminApi.getRestaurants({ status: 'suspended' });
      setRestaurants(data);
    } catch (err: any) {
      console.error('Failed to load suspended restaurants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuspended();
  }, []);

  const handleOpenModal = (action: AdminActionType, rest: AdminRestaurantItem) => {
    setSelectedRestaurant(rest);
    setModalAction(action);
  };

  const handleConfirmAction = async (restaurantId: string, reason?: string) => {
    if (!modalAction) return;

    if (modalAction === 'reactivate') {
      const res = await adminApi.reactivateRestaurant(restaurantId);
      setFeedback({ type: 'success', message: res.message });
    }

    await loadSuspended();
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
        <span className="text-xs uppercase tracking-widest text-[#C6A47E]">Loading Suspended Restaurants...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-[#F5F0E9]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#332A25]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
              Administrative Control
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#F5F0E9] tracking-tight">
            Suspended Restaurants ({restaurants.length})
          </h1>
          <p className="text-xs text-[#8D8178] mt-1">
            Venues whose public dining listings and table reservations are currently frozen.
          </p>
        </div>

        {/* Search */}
        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 text-[#8D8178] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search suspended venues..."
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

      {/* List */}
      {filtered.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#181513] border border-[#332A25] text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <h3 className="font-serif text-base font-bold text-[#F5F0E9]">
            No Suspended Restaurants
          </h3>
          <p className="text-xs text-[#8D8178] max-w-sm mx-auto">
            {restaurants.length === 0 ? 'All approved venues are in active, good standing.' : 'No suspended restaurants match your search query.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(rest => (
            <div
              key={rest.id}
              className="p-5 sm:p-6 rounded-2xl bg-[#181513] border border-amber-900/40 space-y-4 shadow-lg hover:border-amber-700/50 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-lg font-bold text-[#F5F0E9]">
                      {rest.name}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Suspended
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#8D8178]">
                    <span>Host: <strong className="text-[#F5F0E9]">{rest.owner?.fullName || rest.email}</strong></span>
                    <span>&bull;</span>
                    <span>City: {rest.city}</span>
                    <span>&bull;</span>
                    <span>Suspended: {rest.suspendedAt ? new Date(rest.suspendedAt).toLocaleDateString() : 'Recorded'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenModal('reactivate', rest)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer self-start sm:self-auto shadow-md"
                >
                  Reactivate Restaurant
                </button>
              </div>

              {/* Suspension Reason Banner */}
              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs text-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px] uppercase tracking-wider">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Administrative Suspension Notice</span>
                </div>
                <p className="leading-relaxed">
                  {rest.suspendedReason || 'Administrative suspension initiated by platform governance team.'}
                </p>
                {rest.reviewedByAdminId && (
                  <div className="text-[10px] text-amber-300/70 pt-1">
                    Administrator ID: <code>{rest.reviewedByAdminId}</code>
                  </div>
                )}
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

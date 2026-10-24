'use client';

import React, { useState, useEffect } from 'react';
import { 
  XCircle, 
  Store, 
  MapPin, 
  User, 
  Calendar, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  Clock
} from 'lucide-react';
import { adminApi, AdminRestaurantItem } from '@/lib/adminApi';
import AdminActionModal, { AdminActionType } from '@/components/admin/AdminActionModal';

export default function AdminRejectedPage() {
  const [restaurants, setRestaurants] = useState<AdminRestaurantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [modalAction, setModalAction] = useState<AdminActionType | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<AdminRestaurantItem | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadRejected = async () => {
    try {
      const data = await adminApi.getRestaurants({ status: 'rejected' });
      setRestaurants(data);
    } catch (err: any) {
      console.error('Failed to load rejected restaurants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRejected();
  }, []);

  const handleOpenModal = (action: AdminActionType, rest: AdminRestaurantItem) => {
    setSelectedRestaurant(rest);
    setModalAction(action);
  };

  const handleConfirmAction = async (restaurantId: string, reason?: string) => {
    if (!modalAction) return;

    if (modalAction === 'approve') {
      const res = await adminApi.approveRestaurant(restaurantId);
      setFeedback({ type: 'success', message: res.message });
    }

    await loadRejected();
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
        <span className="text-xs uppercase tracking-widest text-[#C6A47E]">Loading Rejected Registrations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-[#F5F0E9]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#332A25]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-rose-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400">
              Audit Archive
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#F5F0E9] tracking-tight">
            Rejected Registrations ({restaurants.length})
          </h1>
          <p className="text-xs text-[#8D8178] mt-1">
            Applications that were declined during administrative review. Stored with full audit logs and reason records.
          </p>
        </div>

        {/* Search */}
        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 text-[#8D8178] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search rejected applications..."
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
            No Rejected Applications
          </h3>
          <p className="text-xs text-[#8D8178] max-w-sm mx-auto">
            {restaurants.length === 0 ? 'No restaurant applications have been declined.' : 'No rejected applications match your search query.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(rest => (
            <div
              key={rest.id}
              className="p-5 sm:p-6 rounded-2xl bg-[#181513] border border-rose-950/40 space-y-4 shadow-lg hover:border-rose-900/50 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-lg font-bold text-[#F5F0E9]">
                      {rest.name}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Rejected
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#8D8178]">
                    <span>Applicant: <strong className="text-[#F5F0E9]">{rest.owner?.fullName || rest.email}</strong></span>
                    <span>&bull;</span>
                    <span>City: {rest.city}</span>
                    <span>&bull;</span>
                    <span>Reviewed: {rest.reviewedAt ? new Date(rest.reviewedAt).toLocaleDateString() : 'Recorded'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenModal('approve', rest)}
                  className="px-4 py-2 rounded-xl bg-[#38251F] text-[#C6A47E] border border-[#54372D] hover:bg-emerald-600 hover:text-white hover:border-emerald-500 text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
                >
                  Re-evaluate & Approve
                </button>
              </div>

              {/* Rejection Reason Banner */}
              <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs text-rose-200 space-y-1">
                <div className="flex items-center gap-1.5 text-rose-400 font-semibold text-[11px] uppercase tracking-wider">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Stated Reason For Rejection</span>
                </div>
                <p className="leading-relaxed">
                  {rest.rejectionReason || 'Application details did not satisfy platform dining standards.'}
                </p>
                {rest.reviewedByAdminId && (
                  <div className="text-[10px] text-rose-300/70 pt-1">
                    Reviewing Admin ID: <code>{rest.reviewedByAdminId}</code>
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

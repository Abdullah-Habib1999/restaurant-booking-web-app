'use client';

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Store, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Grid3X3, 
  Info,
  ChevronDown,
  ChevronUp,
  Search,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { adminApi, AdminRestaurantItem } from '@/lib/adminApi';
import AdminActionModal, { AdminActionType } from '@/components/admin/AdminActionModal';

export default function AdminPendingPage() {
  const [restaurants, setRestaurants] = useState<AdminRestaurantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal State
  const [modalAction, setModalAction] = useState<AdminActionType | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<AdminRestaurantItem | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadPending = async () => {
    try {
      const data = await adminApi.getRestaurants({ status: 'pending_approval' });
      setRestaurants(data);
    } catch (err: any) {
      console.error('Failed to load pending restaurants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
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
    } else if (modalAction === 'reject') {
      const res = await adminApi.rejectRestaurant(restaurantId, reason || '');
      setFeedback({ type: 'success', message: res.message });
    }

    await loadPending();
    setTimeout(() => setFeedback(null), 4000);
  };

  const filtered = restaurants.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.owner?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.owner?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="w-8 h-8 border-2 border-[#C6A47E] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs uppercase tracking-widest text-[#C6A47E]">Loading Pending Registrations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-[#F5F0E9]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#332A25]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
              Action Required
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#F5F0E9] tracking-tight">
            Pending Restaurant Approvals
          </h1>
          <p className="text-xs text-[#8D8178] mt-1">
            Review submitted merchant venues, inspect owner qualifications, and grant public booking rights.
          </p>
        </div>

        {/* Search */}
        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 text-[#8D8178] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search venue or applicant..."
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

      {/* Queue List */}
      {filtered.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#181513] border border-[#332A25] text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="font-serif text-lg font-bold text-[#F5F0E9]">
            {restaurants.length === 0 ? 'No Pending Approvals' : 'No Matching Applications'}
          </h3>
          <p className="text-xs text-[#8D8178] max-w-md mx-auto">
            {restaurants.length === 0 
              ? 'All submitted restaurant applications have been reviewed. Newly registered venues will appear here in real-time.' 
              : 'No pending applications matched your search terms.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((rest) => {
            const isExpanded = expandedId === rest.id;
            return (
              <div 
                key={rest.id}
                className="rounded-2xl border border-[#332A25] bg-[#181513] overflow-hidden transition-all shadow-md hover:border-[#54372D]"
              >
                {/* Summary Row */}
                <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-serif text-lg font-bold text-[#F5F0E9] truncate">
                        {rest.name}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Pending Review
                      </span>
                      <span className="text-xs text-[#C6A47E] font-medium">
                        {rest.priceTier}
                      </span>
                    </div>

                    <p className="text-xs text-[#8D8178] line-clamp-1">
                      {rest.tagline || rest.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#B7AAA0] pt-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#C6A47E]" />
                        <span>{rest.city} ({rest.address})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#C6A47E]" />
                        <span>Applicant: <strong className="text-[#F5F0E9]">{rest.owner?.fullName || 'Partner Host'}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#C6A47E]" />
                        <span>Submitted: {new Date(rest.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : rest.id)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1C1917] border border-[#332A25] hover:bg-[#38251F] text-xs font-semibold text-[#B7AAA0] hover:text-[#F5F0E9] transition cursor-pointer"
                    >
                      <span>{isExpanded ? 'Hide Details' : 'Inspect Application'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenModal('approve', rest)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-md cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenModal('reject', rest)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-700/80 hover:bg-rose-600 text-white text-xs font-semibold transition shadow-md cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>

                </div>

                {/* Expanded Inspection Drawer */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 bg-[#141210] border-t border-[#332A25] space-y-5 animate-fade-in text-xs">
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Venue Profile Details */}
                      <div className="p-4 rounded-xl bg-[#181513] border border-[#332A25] space-y-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#C6A47E] block">
                          Venue & Cuisine
                        </span>
                        <div>
                          <div className="text-[#8D8178] text-[11px]">Cuisine Types:</div>
                          <div className="text-[#F5F0E9] font-medium">{rest.cuisineType?.join(', ') || 'General'}</div>
                        </div>
                        <div>
                          <div className="text-[#8D8178] text-[11px]">Seating Mode:</div>
                          <div className="text-[#F5F0E9] capitalize">{rest.seatingManagementMode?.replace('_', ' ')}</div>
                        </div>
                        <div>
                          <div className="text-[#8D8178] text-[11px]">Total Capacity:</div>
                          <div className="text-[#F5F0E9] font-medium">{rest.totalSeatingCapacity} Guests ({rest.tableCount || 0} Tables configured)</div>
                        </div>
                        <div>
                          <div className="text-[#8D8178] text-[11px]">Slot Duration:</div>
                          <div className="text-[#F5F0E9]">{rest.slotDurationMinutes || 90} minutes (+ {rest.bufferTimeMinutes || 15}m turnover)</div>
                        </div>
                      </div>

                      {/* Applicant & Owner Identity */}
                      <div className="p-4 rounded-xl bg-[#181513] border border-[#332A25] space-y-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#C6A47E] block">
                          Merchant / Owner Contact
                        </span>
                        <div>
                          <div className="text-[#8D8178] text-[11px]">Full Name:</div>
                          <div className="text-[#F5F0E9] font-medium">{rest.owner?.fullName || 'Not recorded'}</div>
                        </div>
                        <div>
                          <div className="text-[#8D8178] text-[11px]">Applicant Email:</div>
                          <div className="text-[#F5F0E9]">{rest.owner?.email || rest.email}</div>
                        </div>
                        <div>
                          <div className="text-[#8D8178] text-[11px]">Direct Phone:</div>
                          <div className="text-[#F5F0E9]">{rest.owner?.phone || rest.phone}</div>
                        </div>
                        <div>
                          <div className="text-[#8D8178] text-[11px]">User System ID:</div>
                          <div className="text-[#8D8178] font-mono text-[10px]">{rest.ownerId}</div>
                        </div>
                      </div>

                      {/* Policies & Booking Controls */}
                      <div className="p-4 rounded-xl bg-[#181513] border border-[#332A25] space-y-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#C6A47E] block">
                          Policy & Party Limits
                        </span>
                        <div>
                          <div className="text-[#8D8178] text-[11px]">Party Size Limits:</div>
                          <div className="text-[#F5F0E9]">{rest.minPartySize || 1} to {rest.maxPartySize || 12} guests</div>
                        </div>
                        <div>
                          <div className="text-[#8D8178] text-[11px]">Advance Booking Window:</div>
                          <div className="text-[#F5F0E9]">{rest.advanceBookingDays || 30} days</div>
                        </div>
                        <div>
                          <div className="text-[#8D8178] text-[11px]">Cancellation Cutoff:</div>
                          <div className="text-[#F5F0E9]">{rest.cancellationCutoffHours || 2} hours prior</div>
                        </div>
                        <div>
                          <div className="text-[#8D8178] text-[11px]">Cancellation Policy:</div>
                          <div className="text-[#B7AAA0] text-[11px] line-clamp-2">{rest.cancellationPolicy}</div>
                        </div>
                      </div>

                    </div>

                    {/* Venue Description */}
                    <div className="p-4 rounded-xl bg-[#181513] border border-[#332A25] space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#C6A47E] block">
                        Submitted Description & Concept
                      </span>
                      <p className="text-[#B7AAA0] text-xs leading-relaxed">
                        {rest.description || 'No description provided by applicant.'}
                      </p>
                    </div>

                    {/* Bottom Action Ribbon */}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[11px] text-[#8D8178]">
                        Registration identifier: <code className="text-[#C6A47E]">{rest.id}</code>
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenModal('reject', rest)}
                          className="px-4 py-2 rounded-xl bg-rose-700/80 hover:bg-rose-600 text-white text-xs font-semibold transition cursor-pointer"
                        >
                          Reject Application
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenModal('approve', rest)}
                          className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-md cursor-pointer"
                        >
                          Approve & Publish to Diners
                        </button>
                      </div>
                    </div>

                  </div>
                )}

              </div>
            );
          })}
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

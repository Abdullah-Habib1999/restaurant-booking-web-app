'use client';

import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  Store,
  User,
  MapPin,
  Clock
} from 'lucide-react';
import { AdminRestaurantItem } from '@/lib/adminApi';

export type AdminActionType = 'approve' | 'reject' | 'suspend' | 'reactivate';

interface AdminActionModalProps {
  isOpen: boolean;
  action: AdminActionType | null;
  restaurant: AdminRestaurantItem | null;
  onClose: () => void;
  onConfirm: (restaurantId: string, reason?: string) => Promise<void>;
}

export default function AdminActionModal({
  isOpen,
  action,
  restaurant,
  onClose,
  onConfirm
}: AdminActionModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !action || !restaurant) return null;

  const requiresReason = action === 'reject' || action === 'suspend';

  const handleConfirm = async () => {
    setError(null);
    if (requiresReason && (!reason.trim() || reason.trim().length < 5)) {
      setError(`Please provide a valid ${action} reason (minimum 5 characters).`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(restaurant.id, reason.trim() || undefined);
      setReason('');
      onClose();
    } catch (err: any) {
      setError(err.message || `Failed to ${action} restaurant`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActionConfig = () => {
    switch (action) {
      case 'approve':
        return {
          title: 'Approve Restaurant Registration',
          description: `Are you sure you want to approve "${restaurant.name}"? Once approved, the venue will immediately appear in public dining listings and diners can complete reservations.`,
          badge: 'Publish & Activate',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          btnText: 'Confirm & Approve Venue',
          btnColor: 'bg-emerald-600 hover:bg-emerald-500 text-white',
          icon: CheckCircle2,
          iconColor: 'text-emerald-400'
        };
      case 'reject':
        return {
          title: 'Reject Restaurant Registration',
          description: `You are about to reject the registration application for "${restaurant.name}". The owner will see this reason in their merchant console.`,
          badge: 'Application Rejection',
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          btnText: 'Confirm & Reject Application',
          btnColor: 'bg-rose-700 hover:bg-rose-600 text-white',
          icon: XCircle,
          iconColor: 'text-rose-400'
        };
      case 'suspend':
        return {
          title: 'Suspend Approved Restaurant',
          description: `Suspending "${restaurant.name}" will immediately pause new guest bookings and hide the venue from public searches. Please provide a reason for the record.`,
          badge: 'Administrative Suspension',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          btnText: 'Confirm Suspension',
          btnColor: 'bg-amber-700 hover:bg-amber-600 text-white',
          icon: AlertTriangle,
          iconColor: 'text-amber-400'
        };
      case 'reactivate':
        return {
          title: 'Reactivate Suspended Restaurant',
          description: `Reactivating "${restaurant.name}" will restore its live booking schedule and allow diners to reserve tables.`,
          badge: 'Restore Public Status',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          btnText: 'Confirm Reactivation',
          btnColor: 'bg-[#8B5E45] hover:bg-[#9E6C51] text-[#F5F0E9]',
          icon: CheckCircle2,
          iconColor: 'text-[#C6A47E]'
        };
    }
  };

  const config = getActionConfig();
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-lg bg-[#181513] border border-[#332A25] rounded-2xl p-6 sm:p-7 shadow-2xl space-y-6 text-[#F5F0E9]"
        role="dialog"
        aria-modal="true"
      >
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1C1917] border border-[#332A25] flex items-center justify-center shrink-0">
              <Icon className={`w-5 h-5 ${config.iconColor}`} />
            </div>
            <div>
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border mb-1 ${config.badgeColor}`}>
                {config.badge}
              </span>
              <h3 className="font-serif text-lg font-bold text-[#F5F0E9]">
                {config.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#8D8178] hover:text-[#F5F0E9] hover:bg-[#38251F] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Restaurant Snapshot */}
        <div className="p-3.5 rounded-xl bg-[#0B0B0B] border border-[#332A25] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#F5F0E9] text-sm">{restaurant.name}</span>
            <span className="text-[#C6A47E] font-medium">{restaurant.priceTier} &bull; {restaurant.cuisineType?.join(', ')}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-[#8D8178]">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-[#C6A47E] shrink-0" />
              <span className="truncate">{restaurant.city}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <User className="w-3.5 h-3.5 text-[#C6A47E] shrink-0" />
              <span className="truncate">{restaurant.owner?.fullName || restaurant.email}</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-[#B7AAA0] leading-relaxed">
          {config.description}
        </p>

        {/* Reason Input if required */}
        {requiresReason && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#C6A47E] block">
              {action === 'reject' ? 'Rejection Reason (Visible to Merchant)' : 'Suspension Reason (Administrative Record)'} <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder={
                action === 'reject' 
                  ? 'e.g. Incomplete food safety registration, invalid location address, or missing operating hours documentation.'
                  : 'e.g. Temporary health code inspection pause, partner requested suspension, or billing non-compliance.'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#0B0B0B] border border-[#332A25] text-xs text-[#F5F0E9] placeholder-[#554D47] focus:outline-none focus:border-[#C6A47E] resize-none"
            />
            <p className="text-[10px] text-[#8D8178]">
              Minimum 5 characters. Stored securely and attached to this review audit log.
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-[#332A25] bg-[#1C1917] hover:bg-[#38251F] text-xs font-semibold text-[#B7AAA0] hover:text-[#F5F0E9] transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2 ${config.btnColor}`}
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>{config.btnText}</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

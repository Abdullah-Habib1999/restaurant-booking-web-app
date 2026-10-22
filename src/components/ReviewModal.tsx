'use client';

import React, { useState } from 'react';
import { Star, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Reservation, Review } from '@/types';
import { db } from '@/lib/db';

interface ReviewModalProps {
  reservation: Reservation;
  existingReview?: Review | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const VISIT_TAGS = [
  'Excellent Food',
  'Friendly Staff',
  'Great Ambience',
  'Good Value',
  'Long Waiting Time',
  'Romantic Setting',
  'Quick Service',
  'Exceptional Wine Pairing'
];

export default function ReviewModal({
  reservation,
  existingReview,
  isOpen,
  onClose,
  onSuccess
}: ReviewModalProps) {
  const isEditing = Boolean(existingReview);

  const [overallRating, setOverallRating] = useState<number>(existingReview?.overallRating || 5);
  const [hoverOverall, setHoverOverall] = useState<number | null>(null);

  const [foodRating, setFoodRating] = useState<number | undefined>(existingReview?.foodRating);
  const [serviceRating, setServiceRating] = useState<number | undefined>(existingReview?.serviceRating);
  const [ambienceRating, setAmbienceRating] = useState<number | undefined>(existingReview?.ambienceRating);
  const [valueRating, setValueRating] = useState<number | undefined>(existingReview?.valueRating);

  const [comment, setComment] = useState<string>(existingReview?.comment || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(existingReview?.tags || []);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!overallRating || overallRating < 1 || overallRating > 5) {
      setErrorMsg('Please select an overall rating of 1 to 5 stars.');
      return;
    }

    setSubmitting(true);

    try {
      if (isEditing && existingReview) {
        const res = await db.updateReview(existingReview.id, existingReview.customerId, {
          overallRating,
          foodRating,
          serviceRating,
          ambienceRating,
          valueRating,
          comment,
          tags: selectedTags
        });

        if (res.success) {
          setSuccessMsg('Your review has been successfully updated.');
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 1200);
        } else {
          setErrorMsg(res.error || 'Failed to update review.');
        }
      } else {
        const res = await db.createReview({
          restaurantId: reservation.restaurantId,
          customerId: reservation.customerId,
          customerName: reservation.customerName,
          customerEmail: reservation.customerEmail,
          reservationId: reservation.id,
          overallRating,
          foodRating,
          serviceRating,
          ambienceRating,
          valueRating,
          comment,
          tags: selectedTags
        });

        if (res.success) {
          setSuccessMsg('Thank you! Your verified dining review has been posted.');
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 1400);
        } else {
          setErrorMsg(res.error || 'Failed to submit review.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderRatingStars = (
    label: string,
    currentValue: number | undefined,
    onChange: (val: number) => void,
    isRequired: boolean = false
  ) => {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[#E8E1DA]/60 last:border-0">
        <div>
          <span className="text-xs font-semibold text-[#1C1C1C]">
            {label} {isRequired && <span className="text-red-600">*</span>}
          </span>
          {!isRequired && (
            <span className="text-[10px] text-[#795548] ml-1.5 font-medium">Optional</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map(star => {
            const isFilled = (currentValue || 0) >= star;
            return (
              <button
                key={star}
                type="button"
                onClick={() => onChange(star)}
                className="p-1 rounded-md hover:scale-115 transition-transform focus:outline-none cursor-pointer"
                aria-label={`${star} star`}
              >
                <Star
                  className={`w-5 h-5 ${
                    isFilled
                      ? 'text-amber-500 fill-amber-500'
                      : 'text-gray-300 hover:text-amber-300'
                  }`}
                />
              </button>
            );
          })}
          {currentValue !== undefined && !isRequired && (
            <button
              type="button"
              onClick={() => onChange(0)}
              className="text-[10px] text-[#795548] hover:underline ml-1 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="relative bg-white rounded-3xl max-w-xl w-full border border-[#E8E1DA] shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#E8E1DA] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                Verified Dining Visit
              </span>
              <span className="text-xs text-[#795548] font-mono font-medium">
                Ref: {reservation.bookingReference}
              </span>
            </div>
            <h2 className="font-serif text-2xl font-bold text-[#1C1C1C] mt-1.5">
              {isEditing ? 'Edit Your Experience' : 'Rate Your Dining Experience'}
            </h2>
            <p className="text-xs text-[#6B625D] mt-0.5">
              Visited <strong className="text-[#1C1C1C]">{reservation.restaurantName}</strong> on {reservation.reservationDate} ({reservation.partySize} guests).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Overall Rating Hero Selection */}
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E1DA] text-center space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4E342E]">
              Overall Dining Rating <span className="text-red-600">*</span>
            </label>
            <div className="flex items-center justify-center gap-2 pt-1">
              {[1, 2, 3, 4, 5].map(star => {
                const isFilled = (hoverOverall !== null ? hoverOverall : overallRating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverOverall(star)}
                    onMouseLeave={() => setHoverOverall(null)}
                    onClick={() => setOverallRating(star)}
                    className="p-1.5 rounded-xl hover:scale-120 transition-all focus:outline-none cursor-pointer"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        isFilled
                          ? 'text-amber-500 fill-amber-500 drop-shadow-xs'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <div className="text-xs font-semibold text-[#795548]">
              {overallRating === 5 && '★★★★★ Exceptional dining'}
              {overallRating === 4 && '★★★★ Very good experience'}
              {overallRating === 3 && '★★★ Average visit'}
              {overallRating === 2 && '★★ Disappointing'}
              {overallRating === 1 && '★ Poor experience'}
            </div>
          </div>

          {/* 2. Detailed Dimension Ratings */}
          <div className="space-y-1 bg-white p-3.5 rounded-2xl border border-[#E8E1DA]">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-[#795548] mb-1">
              Detailed Experience Ratings
            </span>
            {renderRatingStars('Food Quality & Taste', foodRating, (val) => setFoodRating(val || undefined))}
            {renderRatingStars('Service & Hospitality', serviceRating, (val) => setServiceRating(val || undefined))}
            {renderRatingStars('Ambience & Atmosphere', ambienceRating, (val) => setAmbienceRating(val || undefined))}
            {renderRatingStars('Value for Money', valueRating, (val) => setValueRating(val || undefined))}
          </div>

          {/* 3. Feedback Tags */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B625D]">
              Visit Highlights & Tags <span className="text-[10px] font-normal lowercase">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {VISIT_TAGS.map(tag => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#4E342E] text-white shadow-xs'
                        : 'bg-[#FAF9F6] border border-[#E8E1DA] text-[#6B625D] hover:bg-[#E8E1DA]/50'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Written Comments */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B625D]">
              Written Review <span className="text-[10px] font-normal lowercase">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell fellow diners about your meal, favorite dishes, or the hospitality..."
              maxLength={1000}
              className="w-full p-3 rounded-xl border border-[#E8E1DA] text-xs text-[#1C1C1C] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#795548]/30 bg-[#FAF9F6] resize-none"
            />
            <div className="text-right text-[10px] text-[#795548]">
              {comment.length}/1000 characters
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E1DA]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[#6B625D] hover:bg-gray-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-[#4E342E] hover:bg-[#795548] text-white text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {submitting ? 'Submitting...' : isEditing ? 'Save Changes' : 'Submit Verified Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

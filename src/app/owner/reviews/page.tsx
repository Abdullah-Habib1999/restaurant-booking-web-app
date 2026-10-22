'use client';

import React, { useState, useEffect } from 'react';
import { 
  Star, 
  MessageSquare, 
  ShieldCheck, 
  ArrowUpDown, 
  Flag, 
  CheckCircle2, 
  AlertCircle,
  CornerDownRight,
  Send,
  Calendar,
  Users
} from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import { Restaurant, Review, ReviewStats } from '@/types';

export default function OwnerReviewsPage() {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Sorting & Filtering
  const [sortBy, setSortBy] = useState<'recent' | 'highest' | 'lowest'>('recent');
  const [starFilter, setStarFilter] = useState<string>('all');

  // Response form state
  const [respondingReviewId, setRespondingReviewId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);

  // Report modal state
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchRestaurantAndReviews = async () => {
    setLoading(true);
    const targetId = user?.ownedRestaurantId || 'rest-1';
    const rest = await db.getRestaurantById(targetId);
    if (rest) {
      setRestaurant(rest);
      const [revs, st] = await Promise.all([
        db.getReviews({ restaurantId: rest.id, sortBy }),
        db.getReviewStats(rest.id)
      ]);
      setReviews(revs);
      setStats(st);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRestaurantAndReviews();
  }, [user, sortBy]);

  const handleSendResponse = async (reviewId: string) => {
    if (!responseText.trim()) return;
    setSubmittingResponse(true);
    const ownerId = user?.id || 'owner-1';
    const res = await db.respondToReview(reviewId, ownerId, responseText.trim());
    setSubmittingResponse(false);

    if (res.success) {
      setNotification({ text: 'Your official owner response has been published publicly.', type: 'success' });
      setRespondingReviewId(null);
      setResponseText('');
      fetchRestaurantAndReviews();
    } else {
      setNotification({ text: res.error || 'Failed to publish response.', type: 'error' });
    }
  };

  const handleReportReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingReviewId || !reportReason.trim()) return;

    setSubmittingReport(true);
    const ownerId = user?.id || 'owner-1';
    const res = await db.reportReview(reportingReviewId, ownerId, reportReason.trim());
    setSubmittingReport(false);

    if (res.success) {
      setNotification({ text: 'Review has been flagged for trust & safety moderation.', type: 'success' });
      setReportingReviewId(null);
      setReportReason('');
      fetchRestaurantAndReviews();
    } else {
      setNotification({ text: res.error || 'Failed to report review.', type: 'error' });
    }
  };

  const filteredReviews = reviews.filter(r => {
    if (starFilter !== 'all' && r.overallRating !== Number(starFilter)) return false;
    return true;
  });

  const renderStars = (rating: number, max: number = 5, size: string = 'w-4 h-4') => {
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }).map((_, idx) => (
          <Star
            key={idx}
            className={`${size} ${
              idx < Math.round(rating)
                ? 'text-amber-500 fill-amber-500'
                : 'text-gray-200'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      
      {/* Title & Guidelines */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#795548]">
            Merchant Reputation Console
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1C1C] mt-0.5">
            Customer Ratings & Reviews
          </h1>
          <p className="text-sm text-[#6B625D] mt-1">
            Verified dining feedback for <strong className="text-[#1C1C1C]">{restaurant?.name || 'Your Restaurant'}</strong>. Reviews are guaranteed from completed visits.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-700" />
            Fairness Protected: Unalterable Reviews
          </span>
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl text-xs font-semibold border flex items-center justify-between ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)} className="underline cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* RATING METRICS CARDS */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Average Overall */}
          <div className="p-5 rounded-2xl bg-white border border-[#E8E1DA] shadow-xs space-y-1">
            <div className="flex items-center justify-between text-[#6B625D]">
              <span className="text-xs font-bold uppercase tracking-wider">Overall Rating</span>
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-serif font-bold text-[#1C1C1C]">
                {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-[#6B625D]">/ 5.0</span>
            </div>
            <p className="text-[11px] text-[#795548]">
              From {stats.reviewCount} verified dining {stats.reviewCount === 1 ? 'experience' : 'experiences'}
            </p>
          </div>

          {/* Food Quality */}
          <div className="p-5 rounded-2xl bg-white border border-[#E8E1DA] shadow-xs space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B625D]">Food Quality</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-serif font-bold text-[#1C1C1C]">
                {stats.avgFood ? stats.avgFood.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-[#6B625D]">/ 5.0</span>
            </div>
            <p className="text-[11px] text-[#795548]">Kitchen craftsmanship score</p>
          </div>

          {/* Service & Hospitality */}
          <div className="p-5 rounded-2xl bg-white border border-[#E8E1DA] shadow-xs space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B625D]">Service Hospitality</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-serif font-bold text-[#1C1C1C]">
                {stats.avgService ? stats.avgService.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-[#6B625D]">/ 5.0</span>
            </div>
            <p className="text-[11px] text-[#795548]">Staff attentiveness & speed</p>
          </div>

          {/* Ambience & Atmosphere */}
          <div className="p-5 rounded-2xl bg-white border border-[#E8E1DA] shadow-xs space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B625D]">Ambience & Value</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-serif font-bold text-[#1C1C1C]">
                {stats.avgAmbience ? stats.avgAmbience.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-[#6B625D]">/ 5.0</span>
            </div>
            <p className="text-[11px] text-[#795548]">
              Value: {stats.avgValue ? `${stats.avgValue.toFixed(1)}/5` : '—'}
            </p>
          </div>
        </div>
      )}

      {/* FILTER & SORT BAR */}
      <div className="bg-white rounded-2xl border border-[#E8E1DA] p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Star Filter */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <span className="text-xs font-bold text-[#6B625D] shrink-0">Filter:</span>
          {['all', '5', '4', '3', '2', '1'].map(filterVal => (
            <button
              key={filterVal}
              type="button"
              onClick={() => setStarFilter(filterVal)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                starFilter === filterVal
                  ? 'bg-[#3B2924] text-white shadow-xs'
                  : 'bg-[#FAF9F6] border border-[#E8E1DA] text-[#6B625D] hover:bg-gray-100'
              }`}
            >
              {filterVal === 'all' ? 'All Reviews' : `${filterVal} Stars`}
            </button>
          ))}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <ArrowUpDown className="w-3.5 h-3.5 text-[#795548]" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl border border-[#E8E1DA] text-xs font-semibold text-[#1C1C1C] bg-[#FAF9F6] cursor-pointer"
          >
            <option value="recent">Most Recent First</option>
            <option value="highest">Highest Rating First</option>
            <option value="lowest">Lowest Rating First</option>
          </select>
        </div>

      </div>

      {/* REVIEWS LIST */}
      <div className="bg-white rounded-3xl border border-[#E8E1DA] overflow-hidden shadow-xs">
        
        {loading ? (
          <div className="p-12 text-center text-xs text-[#6B625D]">Loading verified dining reviews...</div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#6B625D] space-y-2">
            <MessageSquare className="w-8 h-8 text-[#795548]/50 mx-auto" />
            <p className="font-semibold text-sm text-[#1C1C1C]">No reviews match your selected filter.</p>
            <p>Customers will be prompted to leave a review after their dining reservation is marked Completed.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E8E1DA]/60">
            {filteredReviews.map(review => (
              <div key={review.id} className="p-6 space-y-4 hover:bg-[#FAF9F6]/40 transition">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#4E342E] text-white flex items-center justify-center font-bold text-sm">
                      {review.customerName ? review.customerName[0].toUpperCase() : 'G'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="font-serif text-base text-[#1C1C1C]">
                          {review.customerName}
                        </strong>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified Visit
                        </span>
                        {review.isReported && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Flagged for Review
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#6B625D] mt-0.5 flex flex-wrap items-center gap-2">
                        <span>Reviewed {new Date(review.createdAt).toLocaleDateString()}</span>
                        {review.visitDate && <span>• Visited {review.visitDate}</span>}
                        {review.partySize && <span>• {review.partySize} Guests</span>}
                      </div>
                    </div>
                  </div>

                  {/* Rating Stars & Quick Flag */}
                  <div className="flex items-center gap-3 self-start sm:self-center">
                    <div className="flex items-center gap-1 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                      {renderStars(review.overallRating, 5, 'w-4 h-4')}
                      <span className="text-xs font-bold text-amber-900 ml-1">
                        {review.overallRating}.0
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setReportingReviewId(review.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition cursor-pointer"
                      title="Report abusive review to TableReserve Trust & Safety"
                    >
                      <Flag className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Subcategory Ratings */}
                {(review.foodRating || review.serviceRating || review.ambienceRating || review.valueRating) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-xl bg-[#FAF9F6] text-xs text-[#6B625D]">
                    {review.foodRating && <div>Food Quality: <strong className="text-[#1C1C1C]">{review.foodRating}/5</strong></div>}
                    {review.serviceRating && <div>Service: <strong className="text-[#1C1C1C]">{review.serviceRating}/5</strong></div>}
                    {review.ambienceRating && <div>Ambience: <strong className="text-[#1C1C1C]">{review.ambienceRating}/5</strong></div>}
                    {review.valueRating && <div>Value: <strong className="text-[#1C1C1C]">{review.valueRating}/5</strong></div>}
                  </div>
                )}

                {/* Comment */}
                {review.comment && (
                  <p className="text-sm text-[#1C1C1C] leading-relaxed whitespace-pre-line bg-white p-3 rounded-xl border border-[#E8E1DA]/60">
                    "{review.comment}"
                  </p>
                )}

                {/* Tags */}
                {review.tags && review.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {review.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-lg bg-[#FAF9F6] border border-[#E8E1DA] text-[11px] font-medium text-[#4E342E]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Public Owner Response Section */}
                {review.ownerResponse ? (
                  <div className="p-4 rounded-2xl bg-[#F8F5F0] border-l-4 border-[#795548] border-t border-r border-b border-[#E8E1DA] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <strong className="text-[#4E342E] font-serif flex items-center gap-1.5">
                        <CornerDownRight className="w-3.5 h-3.5 text-[#795548]" />
                        Your Public Response
                      </strong>
                      <div className="flex items-center gap-2">
                        {review.ownerRespondedAt && (
                          <span className="text-[11px] text-[#795548]">
                            {new Date(review.ownerRespondedAt).toLocaleDateString()}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setRespondingReviewId(review.id);
                            setResponseText(review.ownerResponse || '');
                          }}
                          className="text-xs text-[#795548] hover:underline font-semibold cursor-pointer"
                        >
                          Update Response
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-[#1C1C1C] leading-relaxed">
                      {review.ownerResponse}
                    </p>
                  </div>
                ) : (
                  <div>
                    {respondingReviewId !== review.id && (
                      <button
                        type="button"
                        onClick={() => {
                          setRespondingReviewId(review.id);
                          setResponseText('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#795548] text-[#795548] hover:bg-[#795548] hover:text-white text-xs font-semibold transition cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Respond Publicly
                      </button>
                    )}
                  </div>
                )}

                {/* Inline Response Form */}
                {respondingReviewId === review.id && (
                  <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E1DA] space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#4E342E] uppercase tracking-wider">
                        Public Owner Response to {review.customerName}
                      </label>
                      <span className="text-[11px] text-[#795548]">Visible to all diners on restaurant profile</span>
                    </div>
                    <textarea
                      rows={3}
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Thank the diner for their visit, address constructive feedback, or invite them back..."
                      className="w-full p-3 rounded-xl border border-[#E8E1DA] text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#795548]/30 bg-white resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRespondingReviewId(null);
                          setResponseText('');
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#6B625D] hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendResponse(review.id)}
                        disabled={submittingResponse || !responseText.trim()}
                        className="px-4 py-1.5 rounded-xl bg-[#4E342E] hover:bg-[#795548] text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {submittingResponse ? 'Publishing...' : 'Publish Response'}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            ))}
          </div>
        )}

      </div>

      {/* REPORT / MODERATION MODAL */}
      {reportingReviewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#E8E1DA] shadow-xl space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#1C1C1C] flex items-center gap-2">
              <Flag className="w-4 h-4 text-red-600" />
              Report Review for Moderation
            </h3>
            <p className="text-xs text-[#6B625D]">
              Restaurant owners cannot delete or modify customer reviews directly. You may report inappropriate or abusive content to platform moderation.
            </p>

            <form onSubmit={handleReportReview} className="space-y-4">
              <textarea
                rows={3}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Describe why this review violates platform terms (e.g. extortion, hate speech, inappropriate content)..."
                required
                className="w-full p-3 rounded-xl border border-[#E8E1DA] text-xs focus:outline-none focus:ring-2 focus:ring-[#795548]/30 bg-[#FAF9F6] resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReportingReviewId(null);
                    setReportReason('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs text-[#6B625D] hover:bg-gray-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-semibold shadow-xs"
                >
                  {submittingReport ? 'Reporting...' : 'Submit to Moderation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

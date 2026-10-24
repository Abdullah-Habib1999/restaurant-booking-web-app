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
          <span className="text-xs font-bold uppercase tracking-wider text-[#C6A47E]">
            Merchant Reputation Console
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#F5F0E9] mt-0.5">
            Customer Ratings & Reviews
          </h1>
          <p className="text-sm text-[#B7AAA0] mt-1">
            Verified dining feedback for <strong className="text-[#F5F0E9]">{restaurant?.name || 'Your Restaurant'}</strong>. Reviews are guaranteed from completed visits.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-[#291F11] text-[#FDE68A] border border-[#5E4018] text-xs font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#C6A47E]" />
            Fairness Protected: Unalterable Reviews
          </span>
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl text-xs font-semibold border flex items-center justify-between ${
          notification.type === 'success' 
            ? 'bg-[#132A1C] border-[#22543D] text-[#86EFAC]' 
            : 'bg-[#2E1212] border-[#7F1D1D] text-[#FCA5A5]'
        }`}>
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)} className="underline cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* RATING METRICS CARDS */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Average Overall */}
          <div className="p-5 rounded-2xl bg-[#181513] border border-[#332A25] shadow-sm space-y-1">
            <div className="flex items-center justify-between text-[#8D8178]">
              <span className="text-xs font-bold uppercase tracking-wider">Overall Rating</span>
              <Star className="w-4 h-4 text-[#C6A47E] fill-[#C6A47E]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-serif font-bold text-[#F5F0E9]">
                {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-[#8D8178]">/ 5.0</span>
            </div>
            <p className="text-[11px] text-[#C6A47E]">
              From {stats.reviewCount} verified dining {stats.reviewCount === 1 ? 'experience' : 'experiences'}
            </p>
          </div>

          {/* Food Quality */}
          <div className="p-5 rounded-2xl bg-[#181513] border border-[#332A25] shadow-sm space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8D8178]">Food Quality</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-serif font-bold text-[#F5F0E9]">
                {stats.avgFood ? stats.avgFood.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-[#8D8178]">/ 5.0</span>
            </div>
            <p className="text-[11px] text-[#C6A47E]">Kitchen craftsmanship score</p>
          </div>

          {/* Service & Hospitality */}
          <div className="p-5 rounded-2xl bg-[#181513] border border-[#332A25] shadow-sm space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8D8178]">Service Hospitality</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-serif font-bold text-[#F5F0E9]">
                {stats.avgService ? stats.avgService.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-[#8D8178]">/ 5.0</span>
            </div>
            <p className="text-[11px] text-[#C6A47E]">Staff attentiveness & speed</p>
          </div>

          {/* Ambience & Atmosphere */}
          <div className="p-5 rounded-2xl bg-[#181513] border border-[#332A25] shadow-sm space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8D8178]">Ambience & Value</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-serif font-bold text-[#F5F0E9]">
                {stats.avgAmbience ? stats.avgAmbience.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-[#8D8178]">/ 5.0</span>
            </div>
            <p className="text-[11px] text-[#C6A47E]">
              Value: {stats.avgValue ? `${stats.avgValue.toFixed(1)}/5` : '—'}
            </p>
          </div>
        </div>
      )}

      {/* FILTER & SORT BAR */}
      <div className="bg-[#181513] rounded-2xl border border-[#332A25] p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Star Filter */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <span className="text-xs font-bold text-[#8D8178] shrink-0">Filter:</span>
          {['all', '5', '4', '3', '2', '1'].map(filterVal => (
            <button
              key={filterVal}
              type="button"
              onClick={() => setStarFilter(filterVal)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                starFilter === filterVal
                  ? 'bg-[#8B5E45] text-[#F5F0E9] shadow-sm'
                  : 'bg-[#151311] border border-[#332A25] text-[#8D8178] hover:text-[#F5F0E9]'
              }`}
            >
              {filterVal === 'all' ? 'All Reviews' : `${filterVal} Stars`}
            </button>
          ))}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <ArrowUpDown className="w-3.5 h-3.5 text-[#C6A47E]" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl border border-[#332A25] text-xs font-semibold text-[#F5F0E9] bg-[#151311] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
          >
            <option value="recent">Most Recent First</option>
            <option value="highest">Highest Rating First</option>
            <option value="lowest">Lowest Rating First</option>
          </select>
        </div>

      </div>

      {/* REVIEWS LIST */}
      <div className="bg-[#181513] rounded-3xl border border-[#332A25] overflow-hidden shadow-sm">
        
        {loading ? (
          <div className="p-12 text-center text-xs text-[#8D8178]">Loading verified dining reviews...</div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#8D8178] space-y-2">
            <MessageSquare className="w-8 h-8 text-[#8B5E45]/50 mx-auto" />
            <p className="font-semibold text-sm text-[#F5F0E9]">No reviews match your selected filter.</p>
            <p>Customers will be prompted to leave a review after their dining reservation is marked Completed.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#332A25]">
            {filteredReviews.map(review => (
              <div key={review.id} className="p-6 space-y-4 hover:bg-[#1C1917]/50 transition">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#38251F] text-[#F5F0E9] flex items-center justify-center font-bold text-sm">
                      {review.customerName ? review.customerName[0].toUpperCase() : 'G'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="font-serif text-base text-[#F5F0E9]">
                          {review.customerName}
                        </strong>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#132A1C] text-[#86EFAC] border border-[#22543D] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-[#86EFAC]" /> Verified Visit
                        </span>
                        {review.isReported && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#291F11] text-[#FDE68A] border border-[#5E4018]">
                            Flagged for Review
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#8D8178] mt-0.5 flex flex-wrap items-center gap-2">
                        <span>Reviewed {new Date(review.createdAt).toLocaleDateString()}</span>
                        {review.visitDate && <span>• Visited {review.visitDate}</span>}
                        {review.partySize && <span>• {review.partySize} Guests</span>}
                      </div>
                    </div>
                  </div>

                  {/* Rating Stars & Quick Flag */}
                  <div className="flex items-center gap-3 self-start sm:self-center">
                    <div className="flex items-center gap-1 bg-[#151311] px-3 py-1 rounded-full border border-[#332A25]">
                      {renderStars(review.overallRating, 5, 'w-4 h-4')}
                      <span className="text-xs font-bold text-[#C6A47E] ml-1">
                        {review.overallRating}.0
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setReportingReviewId(review.id)}
                      className="p-1.5 text-[#8D8178] hover:text-red-400 rounded-lg transition cursor-pointer"
                      title="Report abusive review to TableReserve Trust & Safety"
                    >
                      <Flag className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Subcategory Ratings */}
                {(review.foodRating || review.serviceRating || review.ambienceRating || review.valueRating) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-xl bg-[#151311] border border-[#332A25] text-xs text-[#B7AAA0]">
                    {review.foodRating && <div>Food Quality: <strong className="text-[#F5F0E9]">{review.foodRating}/5</strong></div>}
                    {review.serviceRating && <div>Service: <strong className="text-[#F5F0E9]">{review.serviceRating}/5</strong></div>}
                    {review.ambienceRating && <div>Ambience: <strong className="text-[#F5F0E9]">{review.ambienceRating}/5</strong></div>}
                    {review.valueRating && <div>Value: <strong className="text-[#F5F0E9]">{review.valueRating}/5</strong></div>}
                  </div>
                )}

                {/* Comment */}
                {review.comment && (
                  <p className="text-sm text-[#F5F0E9] leading-relaxed whitespace-pre-line bg-[#151311] p-3.5 rounded-xl border border-[#332A25]">
                    "{review.comment}"
                  </p>
                )}

                {/* Tags */}
                {review.tags && review.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {review.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-lg bg-[#151311] border border-[#332A25] text-[11px] font-medium text-[#C6A47E]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Public Owner Response Section */}
                {review.ownerResponse ? (
                  <div className="p-4 rounded-2xl bg-[#151311] border-l-4 border-[#8B5E45] border-t border-r border-b border-[#332A25] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <strong className="text-[#C6A47E] font-serif flex items-center gap-1.5">
                        <CornerDownRight className="w-3.5 h-3.5 text-[#8B5E45]" />
                        Your Public Response
                      </strong>
                      <div className="flex items-center gap-2">
                        {review.ownerRespondedAt && (
                          <span className="text-[11px] text-[#8D8178]">
                            {new Date(review.ownerRespondedAt).toLocaleDateString()}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setRespondingReviewId(review.id);
                            setResponseText(review.ownerResponse || '');
                          }}
                          className="text-xs text-[#C6A47E] hover:underline font-semibold cursor-pointer"
                        >
                          Update Response
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-[#B7AAA0] leading-relaxed">
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#8B5E45] text-[#C6A47E] hover:bg-[#8B5E45] hover:text-[#F5F0E9] text-xs font-semibold transition cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Respond Publicly
                      </button>
                    )}
                  </div>
                )}

                {/* Inline Response Form */}
                {respondingReviewId === review.id && (
                  <div className="p-4 rounded-2xl bg-[#151311] border border-[#332A25] space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#C6A47E] uppercase tracking-wider">
                        Public Owner Response to {review.customerName}
                      </label>
                      <span className="text-[11px] text-[#8D8178]">Visible to all diners on restaurant profile</span>
                    </div>
                    <textarea
                      rows={3}
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Thank the diner for their visit, address constructive feedback, or invite them back..."
                      className="w-full p-3 rounded-xl border border-[#332A25] text-xs text-[#F5F0E9] focus:outline-none focus:ring-1 focus:ring-[#8B5E45] bg-[#181513] placeholder-[#8D8178] resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRespondingReviewId(null);
                          setResponseText('');
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#8D8178] hover:text-[#F5F0E9]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendResponse(review.id)}
                        disabled={submittingResponse || !responseText.trim()}
                        className="px-4 py-1.5 rounded-xl bg-[#8B5E45] hover:bg-[#9E6C51] text-[#F5F0E9] text-xs font-bold shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181513] rounded-3xl max-w-md w-full p-6 border border-[#332A25] shadow-2xl space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#F5F0E9] flex items-center gap-2">
              <Flag className="w-4 h-4 text-red-400" />
              Report Review for Moderation
            </h3>
            <p className="text-xs text-[#B7AAA0]">
              Restaurant owners cannot delete or modify customer reviews directly. You may report inappropriate or abusive content to platform moderation.
            </p>

            <form onSubmit={handleReportReview} className="space-y-4">
              <textarea
                rows={3}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Describe why this review violates platform terms (e.g. extortion, hate speech, inappropriate content)..."
                required
                className="w-full p-3 rounded-xl border border-[#332A25] text-xs text-[#F5F0E9] placeholder-[#8D8178] focus:outline-none focus:ring-1 focus:ring-[#8B5E45] bg-[#151311] resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReportingReviewId(null);
                    setReportReason('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs text-[#8D8178] hover:text-[#F5F0E9] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="px-4 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-white text-xs font-semibold shadow-sm cursor-pointer"
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

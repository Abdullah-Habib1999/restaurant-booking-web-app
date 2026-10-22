'use client';

import React, { useState, useEffect } from 'react';
import { 
  Star, 
  MessageSquare, 
  ShieldCheck, 
  ArrowUpDown, 
  Flag, 
  CheckCircle2, 
  UserCheck, 
  AlertCircle,
  ThumbsUp,
  Tag
} from 'lucide-react';
import { Review, ReviewStats } from '@/types';
import { db } from '@/lib/db';

interface RestaurantReviewsSectionProps {
  restaurantId: string;
  restaurantName: string;
}

export default function RestaurantReviewsSection({
  restaurantId,
  restaurantName
}: RestaurantReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'recent' | 'highest' | 'lowest'>('recent');

  // Pagination / Load more
  const [displayCount, setDisplayCount] = useState(5);

  // Report modal state
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);
  const [reportingSubmitting, setReportingSubmitting] = useState(false);

  const loadReviewsAndStats = async () => {
    setLoading(true);
    const [revs, st] = await Promise.all([
      db.getReviews({ restaurantId, sortBy }),
      db.getReviewStats(restaurantId)
    ]);
    setReviews(revs);
    setStats(st);
    setLoading(false);
  };

  useEffect(() => {
    loadReviewsAndStats();
  }, [restaurantId, sortBy]);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingReviewId || !reportReason.trim()) return;

    setReportingSubmitting(true);
    const res = await db.reportReview(reportingReviewId, 'guest', reportReason.trim());
    setReportingSubmitting(false);

    if (res.success) {
      setReportSuccess('Thank you for reporting. This review has been submitted for moderation.');
      setTimeout(() => {
        setReportingReviewId(null);
        setReportReason('');
        setReportSuccess(null);
      }, 2000);
    }
  };

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

  const visibleReviews = reviews.slice(0, displayCount);
  const hasMore = reviews.length > displayCount;

  return (
    <section className="bg-white rounded-3xl border border-[#E8E1DA] p-6 sm:p-10 shadow-xs space-y-8">
      
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E1DA] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#795548]">
              Guest Dining Feedback
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> 100% Verified Diners
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1C1C] mt-1">
            Ratings & Dining Reviews
          </h2>
          <p className="text-xs sm:text-sm text-[#6B625D] mt-0.5">
            Every review is tied directly to a completed table reservation at {restaurantName}.
          </p>
        </div>

        {/* Sort Controls */}
        {reviews.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-center">
            <ArrowUpDown className="w-4 h-4 text-[#795548]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-[#E8E1DA] text-xs font-semibold text-[#1C1C1C] bg-[#FAF9F6] focus:outline-none focus:ring-2 focus:ring-[#795548]/30 cursor-pointer"
            >
              <option value="recent">Most Recent</option>
              <option value="highest">Highest Rated</option>
              <option value="lowest">Lowest Rated</option>
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-[#6B625D]">Loading verified reviews...</div>
      ) : reviews.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12 px-4 max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF9F6] border border-[#E8E1DA] flex items-center justify-center text-[#795548] mx-auto">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-lg font-bold text-[#1C1C1C]">No reviews yet</h3>
          <p className="text-xs text-[#6B625D] leading-relaxed">
            Be among the first to experience dining at {restaurantName}. Complete a reservation to share your verified review.
          </p>
        </div>
      ) : (
        <>
          {/* STATS OVERVIEW CARDS */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 rounded-2xl bg-[#FAF9F6] border border-[#E8E1DA]">
              
              {/* Overall Score (4 cols) */}
              <div className="md:col-span-4 flex flex-col justify-center items-center text-center p-4 bg-white rounded-2xl border border-[#E8E1DA] shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#795548]">Overall Score</span>
                <div className="text-5xl font-serif font-bold text-[#1C1C1C] mt-1">
                  {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
                </div>
                <div className="mt-2 flex items-center justify-center">
                  {renderStars(stats.averageRating, 5, 'w-5 h-5')}
                </div>
                <span className="text-xs text-[#6B625D] mt-2 font-medium">
                  Based on {stats.reviewCount} verified {stats.reviewCount === 1 ? 'review' : 'reviews'}
                </span>
              </div>

              {/* Star Distribution Breakdown (4 cols) */}
              <div className="md:col-span-4 space-y-2 flex flex-col justify-center p-4 bg-white rounded-2xl border border-[#E8E1DA] shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#795548] mb-1">
                  Rating Distribution
                </span>
                {[5, 4, 3, 2, 1].map(star => {
                  const count = stats.distribution[star] || 0;
                  const pct = stats.reviewCount > 0 ? Math.round((count / stats.reviewCount) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-8 font-medium text-[#1C1C1C] flex items-center gap-0.5">
                        {star} <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-[11px] text-[#6B625D]">{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* Dimension Averages (4 cols) */}
              <div className="md:col-span-4 space-y-3 flex flex-col justify-center p-4 bg-white rounded-2xl border border-[#E8E1DA] shadow-xs text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#795548] mb-0.5">
                  Category Ratings
                </span>
                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span className="text-[#6B625D]">Food Quality</span>
                  <div className="flex items-center gap-1.5 font-bold text-[#1C1C1C]">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{stats.avgFood ? `${stats.avgFood.toFixed(1)}/5` : 'N/A'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span className="text-[#6B625D]">Service & Staff</span>
                  <div className="flex items-center gap-1.5 font-bold text-[#1C1C1C]">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{stats.avgService ? `${stats.avgService.toFixed(1)}/5` : 'N/A'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span className="text-[#6B625D]">Ambience & Vibe</span>
                  <div className="flex items-center gap-1.5 font-bold text-[#1C1C1C]">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{stats.avgAmbience ? `${stats.avgAmbience.toFixed(1)}/5` : 'N/A'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-[#6B625D]">Value for Money</span>
                  <div className="flex items-center gap-1.5 font-bold text-[#1C1C1C]">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{stats.avgValue ? `${stats.avgValue.toFixed(1)}/5` : 'N/A'}</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* LIST OF REVIEWS */}
          <div className="space-y-4">
            {visibleReviews.map(review => (
              <div
                key={review.id}
                className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E8E1DA] shadow-xs space-y-4 hover:border-[#795548]/40 transition"
              >
                {/* Reviewer Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E1DA]/60 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#4E342E] text-white flex items-center justify-center font-bold text-sm">
                      {review.customerName ? review.customerName.charAt(0).toUpperCase() : 'G'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="font-serif text-base text-[#1C1C1C]">
                          {review.customerName}
                        </strong>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified Diner
                        </span>
                      </div>
                      <div className="text-xs text-[#6B625D] mt-0.5 flex flex-wrap items-center gap-2">
                        <span>Reviewed {new Date(review.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        {review.visitDate && (
                          <>
                            <span>•</span>
                            <span>Visited on {review.visitDate}</span>
                          </>
                        )}
                        {review.partySize && (
                          <>
                            <span>•</span>
                            <span>Party of {review.partySize}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rating Stars Badge */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
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
                      title="Report inappropriate review"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subcategory Ratings if available */}
                {(review.foodRating || review.serviceRating || review.ambienceRating || review.valueRating) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-xl bg-[#FAF9F6] text-[11px] text-[#6B625D]">
                    {review.foodRating && (
                      <div>Food: <strong className="text-[#1C1C1C]">{review.foodRating}/5</strong></div>
                    )}
                    {review.serviceRating && (
                      <div>Service: <strong className="text-[#1C1C1C]">{review.serviceRating}/5</strong></div>
                    )}
                    {review.ambienceRating && (
                      <div>Ambience: <strong className="text-[#1C1C1C]">{review.ambienceRating}/5</strong></div>
                    )}
                    {review.valueRating && (
                      <div>Value: <strong className="text-[#1C1C1C]">{review.valueRating}/5</strong></div>
                    )}
                  </div>
                )}

                {/* Written Review Comment */}
                {review.comment && (
                  <p className="text-sm text-[#1C1C1C] leading-relaxed whitespace-pre-line">
                    {review.comment}
                  </p>
                )}

                {/* Tags */}
                {review.tags && review.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
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

                {/* Official Restaurant Owner Response */}
                {review.ownerResponse && (
                  <div className="mt-3 p-4 rounded-2xl bg-[#F8F5F0] border-l-4 border-[#795548] border-t border-r border-b border-[#E8E1DA] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <strong className="text-[#4E342E] font-serif flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-[#795548]" />
                        Response from {restaurantName}
                      </strong>
                      {review.ownerRespondedAt && (
                        <span className="text-[11px] text-[#795548]">
                          {new Date(review.ownerRespondedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#1C1C1C] leading-relaxed">
                      {review.ownerResponse}
                    </p>
                  </div>
                )}

              </div>
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setDisplayCount(prev => prev + 5)}
                className="px-6 py-2.5 rounded-xl bg-[#FAF9F6] hover:bg-[#E8E1DA] border border-[#E8E1DA] text-xs font-semibold text-[#1C1C1C] transition cursor-pointer"
              >
                Load More Reviews ({reviews.length - displayCount} remaining)
              </button>
            </div>
          )}
        </>
      )}

      {/* REPORT MODAL */}
      {reportingReviewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#E8E1DA] shadow-xl space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#1C1C1C] flex items-center gap-2">
              <Flag className="w-4 h-4 text-red-600" />
              Report Review for Moderation
            </h3>
            <p className="text-xs text-[#6B625D]">
              TableReserve maintains high review integrity. Reports are reviewed by human moderators against our community guidelines.
            </p>

            {reportSuccess ? (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold">
                {reportSuccess}
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-4">
                <textarea
                  rows={3}
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Explain why this review violates platform policy (e.g. abusive language, commercial spam, false claims)..."
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
                    disabled={reportingSubmitting}
                    className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-semibold shadow-xs"
                  >
                    {reportingSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </section>
  );
}

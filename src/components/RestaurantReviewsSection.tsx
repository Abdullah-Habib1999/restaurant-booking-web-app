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
    <section className="bg-[#181513] rounded-3xl border border-[#332A25] p-6 sm:p-10 shadow-xl shadow-black/50 space-y-8">
      
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#332A25] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#C6A47E]">
              Guest Dining Feedback
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#142816] text-[#81C784] text-[10px] font-bold border border-[#234A28] flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#81C784]" /> 100% Verified Diners
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#F5F0E9] mt-1">
            Ratings & Dining Reviews
          </h2>
          <p className="text-xs sm:text-sm text-[#B7AAA0] mt-0.5">
            Every review is tied directly to a completed table reservation at {restaurantName}.
          </p>
        </div>

        {/* Sort Controls */}
        {reviews.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-center">
            <ArrowUpDown className="w-4 h-4 text-[#C6A47E]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-[#332A25] text-xs font-semibold text-[#F5F0E9] bg-[#151311] focus:outline-none focus:ring-2 focus:ring-[#8B5E45]/40 cursor-pointer"
            >
              <option value="recent" className="bg-[#181513] text-[#F5F0E9]">Most Recent</option>
              <option value="highest" className="bg-[#181513] text-[#F5F0E9]">Highest Rated</option>
              <option value="lowest" className="bg-[#181513] text-[#F5F0E9]">Lowest Rated</option>
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-[#8D8178]">Loading verified reviews...</div>
      ) : reviews.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12 px-4 max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#1C1917] border border-[#332A25] flex items-center justify-center text-[#C6A47E] mx-auto shadow-sm">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-lg font-bold text-[#F5F0E9]">No reviews yet</h3>
          <p className="text-xs text-[#B7AAA0] leading-relaxed">
            Be among the first to experience dining at {restaurantName}. Complete a reservation to share your verified review.
          </p>
        </div>
      ) : (
        <>
          {/* STATS OVERVIEW CARDS */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 rounded-2xl bg-[#151311] border border-[#332A25]">
              
              {/* Overall Score (4 cols) */}
              <div className="md:col-span-4 flex flex-col justify-center items-center text-center p-5 bg-[#1C1917] rounded-2xl border border-[#332A25] shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C6A47E]">Overall Score</span>
                <div className="text-5xl font-serif font-bold text-[#F5F0E9] mt-1">
                  {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
                </div>
                <div className="mt-2 flex items-center justify-center">
                  {renderStars(stats.averageRating, 5, 'w-5 h-5')}
                </div>
                <span className="text-xs text-[#B7AAA0] mt-2 font-medium">
                  Based on {stats.reviewCount} verified {stats.reviewCount === 1 ? 'review' : 'reviews'}
                </span>
              </div>

              {/* Star Distribution Breakdown (4 cols) */}
              <div className="md:col-span-4 space-y-2 flex flex-col justify-center p-5 bg-[#1C1917] rounded-2xl border border-[#332A25] shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C6A47E] mb-1">
                  Rating Distribution
                </span>
                {[5, 4, 3, 2, 1].map(star => {
                  const count = stats.distribution[star] || 0;
                  const pct = stats.reviewCount > 0 ? Math.round((count / stats.reviewCount) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-8 font-medium text-[#F5F0E9] flex items-center gap-0.5">
                        {star} <Star className="w-3 h-3 text-[#C6A47E] fill-[#C6A47E]" />
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-[#151311] border border-[#332A25]/60 overflow-hidden">
                        <div
                          className="h-full bg-[#C6A47E] rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-[11px] text-[#B7AAA0]">{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* Dimension Averages (4 cols) */}
              <div className="md:col-span-4 space-y-3 flex flex-col justify-center p-5 bg-[#1C1917] rounded-2xl border border-[#332A25] shadow-xs text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C6A47E] mb-0.5">
                  Category Ratings
                </span>
                <div className="flex items-center justify-between py-1 border-b border-[#241E1A]">
                  <span className="text-[#B7AAA0]">Food Quality</span>
                  <div className="flex items-center gap-1.5 font-bold text-[#F5F0E9]">
                    <Star className="w-3.5 h-3.5 text-[#C6A47E] fill-[#C6A47E]" />
                    <span>{stats.avgFood ? `${stats.avgFood.toFixed(1)}/5` : 'N/A'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#241E1A]">
                  <span className="text-[#B7AAA0]">Service & Staff</span>
                  <div className="flex items-center gap-1.5 font-bold text-[#F5F0E9]">
                    <Star className="w-3.5 h-3.5 text-[#C6A47E] fill-[#C6A47E]" />
                    <span>{stats.avgService ? `${stats.avgService.toFixed(1)}/5` : 'N/A'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#241E1A]">
                  <span className="text-[#B7AAA0]">Ambience & Vibe</span>
                  <div className="flex items-center gap-1.5 font-bold text-[#F5F0E9]">
                    <Star className="w-3.5 h-3.5 text-[#C6A47E] fill-[#C6A47E]" />
                    <span>{stats.avgAmbience ? `${stats.avgAmbience.toFixed(1)}/5` : 'N/A'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-[#B7AAA0]">Value for Money</span>
                  <div className="flex items-center gap-1.5 font-bold text-[#F5F0E9]">
                    <Star className="w-3.5 h-3.5 text-[#C6A47E] fill-[#C6A47E]" />
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
                className="p-5 sm:p-6 rounded-2xl bg-[#1C1917] border border-[#332A25] shadow-xs space-y-4 hover:border-[#54372D] transition duration-200"
              >
                {/* Reviewer Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#332A25] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#38251F] border border-[#54372D] text-[#C6A47E] flex items-center justify-center font-bold text-sm shadow-xs">
                      {review.customerName ? review.customerName.charAt(0).toUpperCase() : 'G'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="font-serif text-base text-[#F5F0E9]">
                          {review.customerName}
                        </strong>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#142816] text-[#81C784] border border-[#234A28] flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3 text-[#81C784]" /> Verified Diner
                        </span>
                      </div>
                      <div className="text-xs text-[#B7AAA0] mt-0.5 flex flex-wrap items-center gap-2">
                        <span>Reviewed {new Date(review.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        {review.visitDate && (
                          <>
                            <span className="text-[#8D8178]">•</span>
                            <span>Visited on {review.visitDate}</span>
                          </>
                        )}
                        {review.partySize && (
                          <>
                            <span className="text-[#8D8178]">•</span>
                            <span>Party of {review.partySize}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rating Stars Badge */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <div className="flex items-center gap-1.5 bg-[#151311] px-3 py-1 rounded-full border border-[#332A25]">
                      {renderStars(review.overallRating, 5, 'w-4 h-4')}
                      <span className="text-xs font-bold text-[#C6A47E] ml-1">
                        {review.overallRating}.0
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setReportingReviewId(review.id)}
                      className="p-1.5 text-[#8D8178] hover:text-rose-400 rounded-lg transition cursor-pointer"
                      title="Report inappropriate review"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subcategory Ratings if available */}
                {(review.foodRating || review.serviceRating || review.ambienceRating || review.valueRating) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-xl bg-[#151311] border border-[#241E1A] text-[11px] text-[#B7AAA0]">
                    {review.foodRating && (
                      <div>Food: <strong className="text-[#F5F0E9]">{review.foodRating}/5</strong></div>
                    )}
                    {review.serviceRating && (
                      <div>Service: <strong className="text-[#F5F0E9]">{review.serviceRating}/5</strong></div>
                    )}
                    {review.ambienceRating && (
                      <div>Ambience: <strong className="text-[#F5F0E9]">{review.ambienceRating}/5</strong></div>
                    )}
                    {review.valueRating && (
                      <div>Value: <strong className="text-[#F5F0E9]">{review.valueRating}/5</strong></div>
                    )}
                  </div>
                )}

                {/* Written Review Comment */}
                {review.comment && (
                  <p className="text-sm text-[#F5F0E9] leading-relaxed whitespace-pre-line">
                    {review.comment}
                  </p>
                )}

                {/* Tags */}
                {review.tags && review.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
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

                {/* Official Restaurant Owner Response */}
                {review.ownerResponse && (
                  <div className="mt-3 p-4 rounded-2xl bg-[#151311] border-l-4 border-[#8B5E45] border-t border-r border-b border-[#332A25] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <strong className="text-[#C6A47E] font-serif flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-[#C6A47E]" />
                        Response from {restaurantName}
                      </strong>
                      {review.ownerRespondedAt && (
                        <span className="text-[11px] text-[#B7AAA0]">
                          {new Date(review.ownerRespondedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#F5F0E9] leading-relaxed">
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
                className="px-6 py-2.5 rounded-xl bg-[#181513] hover:bg-[#1C1917] border border-[#332A25] text-xs font-semibold text-[#F5F0E9] transition cursor-pointer"
              >
                Load More Reviews ({reviews.length - displayCount} remaining)
              </button>
            </div>
          )}
        </>
      )}

      {/* REPORT MODAL */}
      {reportingReviewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#181513] rounded-3xl max-w-md w-full p-6 border border-[#332A25] shadow-2xl space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#F5F0E9] flex items-center gap-2">
              <Flag className="w-4 h-4 text-rose-400" />
              Report Review for Moderation
            </h3>
            <p className="text-xs text-[#B7AAA0]">
              TableReserve maintains high review integrity. Reports are reviewed by human moderators against our community guidelines.
            </p>

            {reportSuccess ? (
              <div className="p-3 rounded-xl bg-[#142816] border border-[#234A28] text-[#81C784] text-xs font-semibold">
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
                  className="w-full p-3 rounded-xl border border-[#332A25] text-xs text-[#F5F0E9] focus:outline-none focus:ring-2 focus:ring-[#8B5E45]/40 bg-[#151311] resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReportingReviewId(null);
                      setReportReason('');
                    }}
                    className="px-4 py-2 rounded-xl text-xs text-[#B7AAA0] hover:bg-[#1C1917] font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reportingSubmitting}
                    className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold shadow-xs"
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

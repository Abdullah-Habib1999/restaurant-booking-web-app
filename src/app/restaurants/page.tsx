'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, 
  MapPin, 
  Star, 
  Users, 
  ChevronRight,
  Utensils,
  CheckCircle2,
  Calendar,
  Clock
} from 'lucide-react';
import { db } from '@/lib/db';
import { Restaurant, RestaurantHours } from '@/types';

function RestaurantListingContent() {
  const searchParams = useSearchParams();
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const initialQuery = searchParams.get('q') || '';
  const initialDate = searchParams.get('date') || todayStr;
  const initialGuests = searchParams.get('guests') || '2';

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [hoursMap, setHoursMap] = useState<Record<string, RestaurantHours[]>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedCuisine, setSelectedCuisine] = useState<string>('all');
  const [selectedPrice, setSelectedPrice] = useState<string>('all');
  const [filterPartySize, setFilterPartySize] = useState<number>(Number(initialGuests));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await db.getRestaurants();
      const published = data.filter(r => r.status === 'published');
      setRestaurants(published);
      
      // Fetch hours for all published restaurants
      const hMap: Record<string, RestaurantHours[]> = {};
      await Promise.all(
        published.map(async (r) => {
          const h = await db.getRestaurantHours(r.id);
          hMap[r.id] = h;
        })
      );
      setHoursMap(hMap);
      setLoading(false);
    };
    load();
  }, []);

  // Available unique cuisines
  const cuisines = useMemo(() => {
    const set = new Set<string>();
    restaurants.forEach(r => r.cuisineType.forEach(c => set.add(c)));
    return Array.from(set);
  }, [restaurants]);

  // Filtered list
  const filtered = useMemo(() => {
    return restaurants.filter(r => {
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = r.name.toLowerCase().includes(query);
        const matchesCity = r.city.toLowerCase().includes(query);
        const matchesCuisine = r.cuisineType.some(c => c.toLowerCase().includes(query));
        const matchesDesc = r.description.toLowerCase().includes(query);
        if (!matchesName && !matchesCity && !matchesCuisine && !matchesDesc) {
          return false;
        }
      }

      if (selectedCuisine !== 'all' && !r.cuisineType.includes(selectedCuisine)) {
        return false;
      }

      if (selectedPrice !== 'all' && r.priceTier !== selectedPrice) {
        return false;
      }

      if (filterPartySize > r.maxPartySize || filterPartySize < r.minPartySize) {
        return false;
      }

      return true;
    });
  }, [restaurants, searchTerm, selectedCuisine, selectedPrice, filterPartySize]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
      
      {/* Editorial Header */}
      <div className="space-y-3 max-w-3xl">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#C6A47E]">
          Curated Dining Directory
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-[#F5F0E9]">
          Discover Culinary Excellence
        </h1>
        <p className="text-[#B7AAA0] text-sm sm:text-base leading-relaxed">
          Explore celebrated establishments with genuine live table availability. Pre-order Chef specialties in advance to eliminate arrival wait times.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#181513] rounded-3xl border border-[#332A25] p-5 sm:p-6 shadow-xl shadow-black/50 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          
          {/* Search Query */}
          <div>
            <label className="block font-semibold uppercase tracking-wider text-[#C6A47E] mb-1">Search Venues</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#C6A47E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, dish, or location..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#332A25] text-xs text-[#F5F0E9] placeholder-[#8D8178] focus:outline-none focus:ring-2 focus:ring-[#8B5E45]/40 focus:border-[#8B5E45] bg-[#151311] transition-colors"
              />
            </div>
          </div>

          {/* Cuisine Selector */}
          <div>
            <label className="block font-semibold uppercase tracking-wider text-[#C6A47E] mb-1">Cuisine Specialty</label>
            <select
              value={selectedCuisine}
              onChange={(e) => setSelectedCuisine(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#332A25] text-xs text-[#F5F0E9] focus:outline-none focus:ring-2 focus:ring-[#8B5E45]/40 focus:border-[#8B5E45] bg-[#151311] transition-colors"
            >
              <option value="all" className="bg-[#181513] text-[#F5F0E9]">All Cuisines</option>
              {cuisines.map(c => (
                <option key={c} value={c} className="bg-[#181513] text-[#F5F0E9]">{c}</option>
              ))}
            </select>
          </div>

          {/* Price Tier */}
          <div>
            <label className="block font-semibold uppercase tracking-wider text-[#C6A47E] mb-1">Price Range</label>
            <select
              value={selectedPrice}
              onChange={(e) => setSelectedPrice(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#332A25] text-xs text-[#F5F0E9] focus:outline-none focus:ring-2 focus:ring-[#8B5E45]/40 focus:border-[#8B5E45] bg-[#151311] transition-colors"
            >
              <option value="all" className="bg-[#181513] text-[#F5F0E9]">All Price Tiers</option>
              <option value="$" className="bg-[#181513] text-[#F5F0E9]">$ Casual</option>
              <option value="$$" className="bg-[#181513] text-[#F5F0E9]">$$ Distinctive Dining</option>
              <option value="$$$" className="bg-[#181513] text-[#F5F0E9]">$$$ Fine Dining & Bistro</option>
              <option value="$$$$" className="bg-[#181513] text-[#F5F0E9]">$$$$ Haute Gastronomy</option>
            </select>
          </div>

          {/* Party Size */}
          <div>
            <label className="block font-semibold uppercase tracking-wider text-[#C6A47E] mb-1">Guests</label>
            <div className="flex items-center gap-2">
              <select
                value={filterPartySize}
                onChange={(e) => setFilterPartySize(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-[#332A25] text-xs text-[#F5F0E9] focus:outline-none focus:ring-2 focus:ring-[#8B5E45]/40 focus:border-[#8B5E45] bg-[#151311] transition-colors"
              >
                {[1, 2, 3, 4, 5, 6, 8, 10, 12, 14].map(num => (
                  <option key={num} value={num} className="bg-[#181513] text-[#F5F0E9]">
                    Party of {num} {num === 1 ? 'Guest' : 'Guests'}
                  </option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* Filter count summary */}
        <div className="flex items-center justify-between pt-3 border-t border-[#332A25] text-xs text-[#B7AAA0]">
          <span>
            Presenting <strong className="text-[#F5F0E9]">{filtered.length}</strong> available culinary {filtered.length === 1 ? 'venue' : 'venues'}
          </span>
          {(searchTerm || selectedCuisine !== 'all' || selectedPrice !== 'all' || filterPartySize !== 2) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCuisine('all');
                setSelectedPrice('all');
                setFilterPartySize(2);
              }}
              className="text-[#C6A47E] hover:text-[#DFC4A5] font-medium underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Grid of Restaurant Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-96 rounded-3xl bg-[#181513] animate-pulse border border-[#332A25]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 bg-[#181513] rounded-3xl border border-[#332A25] p-8 max-w-lg mx-auto">
          <Utensils className="w-10 h-10 text-[#C6A47E]/40 mx-auto mb-3" />
          <h3 className="font-serif text-xl font-bold text-[#F5F0E9]">No restaurants matched your filters</h3>
          <p className="text-xs text-[#B7AAA0] mt-2">
            Try broadening your search query, selecting different cuisine categories, or adjusting the party size.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map(restaurant => (
            <div
              key={restaurant.id}
              className="group bg-[#1C1917] rounded-3xl border border-[#332A25] hover:border-[#54372D] overflow-hidden shadow-lg shadow-black/40 hover:shadow-black/70 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Photo & Badges */}
                <div className="relative h-60 w-full overflow-hidden bg-[#151311]">
                  <img
                    src={restaurant.coverImageUrl}
                    alt={restaurant.name}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4 bg-[#151311]/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-[#F5F0E9] flex items-center gap-1 border border-[#332A25] shadow-md">
                    {restaurant.reviewCount && restaurant.reviewCount > 0 ? (
                      <>
                        <Star className="w-3.5 h-3.5 text-[#C6A47E] fill-[#C6A47E]" />
                        <span>{restaurant.rating?.toFixed(1)}/5</span>
                        <span className="text-[#8D8178] font-normal">
                          ({restaurant.reviewCount} {restaurant.reviewCount === 1 ? 'review' : 'reviews'})
                        </span>
                      </>
                    ) : (
                      <>
                        <Star className="w-3.5 h-3.5 text-[#54372D]" />
                        <span className="text-[#8D8178] font-medium text-[11px]">No reviews yet</span>
                      </>
                    )}
                  </div>

                  <div className="absolute bottom-4 left-4 flex flex-wrap gap-1.5">
                    <span className="px-3 py-1 rounded-lg bg-[#0B0B0B]/85 backdrop-blur-md text-[#F5F0E9] text-[11px] font-semibold border border-[#332A25]/60">
                      {restaurant.priceTier}
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-[#38251F]/90 backdrop-blur-md text-[#C6A47E] text-[11px] font-semibold border border-[#54372D]">
                      {restaurant.cuisineType[0]}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-6 sm:p-7 space-y-3">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-[#F5F0E9] group-hover:text-[#C6A47E] transition-colors">
                      {restaurant.name}
                    </h3>
                    <p className="text-xs text-[#C6A47E] font-medium mt-0.5">
                      {restaurant.tagline}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#B7AAA0]">
                    <MapPin className="w-3.5 h-3.5 text-[#C6A47E] shrink-0" />
                    <span>{restaurant.address}, {restaurant.city}</span>
                  </div>

                  <p className="text-xs text-[#B7AAA0] line-clamp-2 leading-relaxed">
                    {restaurant.description}
                  </p>

                  <div className="flex flex-wrap gap-2 text-[10px] text-[#F5F0E9] pt-1">
                    {/* Live Timing / Operating Hours */}
                    {(() => {
                      const rHours = hoursMap[restaurant.id];
                      const todayH = (rHours && rHours.length > 0)
                        ? (rHours.find(h => h.dayOfWeek === new Date().getDay()) || rHours[0])
                        : { dayOfWeek: new Date().getDay(), openTime: '12:00', closeTime: '23:00', isClosed: false };
                      return (
                        <span className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 font-semibold ${
                          todayH.isClosed 
                            ? 'bg-[#2B1515] border-[#4D2323] text-[#E57373]' 
                            : 'bg-[#142816] border-[#234A28] text-[#81C784]'
                        }`}>
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>
                            {todayH.isClosed ? 'Closed Today' : `Open: ${todayH.openTime} – ${todayH.closeTime}`}
                          </span>
                        </span>
                      );
                    })()}
                    <span className="px-2.5 py-1 rounded-lg bg-[#151311] border border-[#332A25] text-[#B7AAA0]">
                      Up to {restaurant.maxPartySize} guests
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#151311] border border-[#332A25] text-[#B7AAA0]">
                      {restaurant.seatingManagementMode === 'individual_tables' ? 'Assigned Tables' : 'Seat Allocation'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="p-6 sm:p-7 pt-0">
                <div className="pt-4 border-t border-[#332A25] flex items-center justify-between">
                  <span className="text-xs text-[#B7AAA0]">
                    Available for <strong className="text-[#F5F0E9]">{filterPartySize}</strong> {filterPartySize === 1 ? 'Guest' : 'Guests'}
                  </span>
                  <Link
                    href={`/restaurants/${restaurant.slug}?guests=${filterPartySize}&date=${initialDate}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#8B5E45] hover:bg-[#9E6C51] text-[#F5F0E9] text-xs font-semibold transition shadow-xs border border-[#8B5E45]/80"
                  >
                    <span>Reserve & Pre-Order</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

export default function RestaurantListingPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-xs text-[#8D8178]">Loading curated restaurant catalog...</div>}>
      <RestaurantListingContent />
    </Suspense>
  );
}

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
  Calendar
} from 'lucide-react';
import { db } from '@/lib/db';
import { Restaurant } from '@/types';

function RestaurantListingContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialDate = searchParams.get('date') || '2026-10-22';
  const initialGuests = searchParams.get('guests') || '2';

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
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
      // Public directory shows only published restaurants
      setRestaurants(data.filter(r => r.status === 'published'));
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
        <span className="text-xs font-semibold uppercase tracking-widest text-[#795548]">
          Curated Dining Directory
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-[#201B18]">
          Discover Culinary Excellence
        </h1>
        <p className="text-[#776B63] text-sm sm:text-base leading-relaxed">
          Explore celebrated establishments with genuine live table availability. Pre-order Chef specialties in advance to eliminate arrival wait times.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-[#E6DDD3] p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          
          {/* Search Query */}
          <div>
            <label className="block font-semibold uppercase tracking-wider text-[#776B63] mb-1">Search Venues</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#795548] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, dish, or location..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E6DDD3] text-xs text-[#201B18] focus:outline-none focus:ring-2 focus:ring-[#795548]/30 bg-[#F8F5F0]"
              />
            </div>
          </div>

          {/* Cuisine Selector */}
          <div>
            <label className="block font-semibold uppercase tracking-wider text-[#776B63] mb-1">Cuisine Specialty</label>
            <select
              value={selectedCuisine}
              onChange={(e) => setSelectedCuisine(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E6DDD3] text-xs text-[#201B18] focus:outline-none focus:ring-2 focus:ring-[#795548]/30 bg-[#F8F5F0]"
            >
              <option value="all">All Cuisines</option>
              {cuisines.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Price Tier */}
          <div>
            <label className="block font-semibold uppercase tracking-wider text-[#776B63] mb-1">Price Range</label>
            <select
              value={selectedPrice}
              onChange={(e) => setSelectedPrice(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E6DDD3] text-xs text-[#201B18] focus:outline-none focus:ring-2 focus:ring-[#795548]/30 bg-[#F8F5F0]"
            >
              <option value="all">All Price Tiers</option>
              <option value="$">$ Casual</option>
              <option value="$$">$$ Distinctive Dining</option>
              <option value="$$$">$$$ Fine Dining & Bistro</option>
              <option value="$$$$">$$$$ Haute Gastronomy</option>
            </select>
          </div>

          {/* Party Size */}
          <div>
            <label className="block font-semibold uppercase tracking-wider text-[#776B63] mb-1">Guests</label>
            <div className="flex items-center gap-2">
              <select
                value={filterPartySize}
                onChange={(e) => setFilterPartySize(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E6DDD3] text-xs text-[#201B18] focus:outline-none focus:ring-2 focus:ring-[#795548]/30 bg-[#F8F5F0]"
              >
                {[1, 2, 3, 4, 5, 6, 8, 10, 12, 14].map(num => (
                  <option key={num} value={num}>
                    Party of {num} {num === 1 ? 'Guest' : 'Guests'}
                  </option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* Filter count summary */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E6DDD3] text-xs text-[#776B63]">
          <span>
            Presenting <strong className="text-[#201B18]">{filtered.length}</strong> available culinary {filtered.length === 1 ? 'venue' : 'venues'}
          </span>
          {(searchTerm || selectedCuisine !== 'all' || selectedPrice !== 'all' || filterPartySize !== 2) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCuisine('all');
                setSelectedPrice('all');
                setFilterPartySize(2);
              }}
              className="text-[#795548] hover:text-[#3B2924] font-medium underline cursor-pointer"
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
            <div key={i} className="h-96 rounded-3xl bg-white animate-pulse border border-[#E6DDD3]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-[#E6DDD3] p-8 max-w-lg mx-auto">
          <Utensils className="w-10 h-10 text-[#795548]/40 mx-auto mb-3" />
          <h3 className="font-serif text-xl font-bold text-[#201B18]">No restaurants matched your filters</h3>
          <p className="text-xs text-[#776B63] mt-2">
            Try broadening your search query, selecting different cuisine categories, or adjusting the party size.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map(restaurant => (
            <div
              key={restaurant.id}
              className="group bg-white rounded-3xl border border-[#E6DDD3] overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Photo & Badges */}
                <div className="relative h-60 w-full overflow-hidden bg-gray-100">
                  <img
                    src={restaurant.coverImageUrl}
                    alt={restaurant.name}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-[#201B18] flex items-center gap-1 shadow-2xs">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{restaurant.rating}</span>
                    <span className="text-[#776B63] font-normal">({restaurant.reviewCount})</span>
                  </div>

                  <div className="absolute bottom-4 left-4 flex flex-wrap gap-1.5">
                    <span className="px-3 py-1 rounded-lg bg-[#201B18]/80 backdrop-blur-md text-white text-[11px] font-semibold">
                      {restaurant.priceTier}
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-white/95 backdrop-blur-md text-[#3B2924] text-[11px] font-semibold">
                      {restaurant.cuisineType[0]}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-6 sm:p-7 space-y-3">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-[#201B18] group-hover:text-[#795548] transition-colors">
                      {restaurant.name}
                    </h3>
                    <p className="text-xs text-[#795548] font-medium mt-0.5">
                      {restaurant.tagline}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#776B63]">
                    <MapPin className="w-3.5 h-3.5 text-[#795548] shrink-0" />
                    <span>{restaurant.address}, {restaurant.city}</span>
                  </div>

                  <p className="text-xs text-[#776B63] line-clamp-2 leading-relaxed">
                    {restaurant.description}
                  </p>

                  <div className="flex flex-wrap gap-2 text-[10px] text-[#3B2924] pt-1">
                    <span className="px-2.5 py-1 rounded-lg bg-[#F8F5F0] border border-[#E6DDD3]">
                      Up to {restaurant.maxPartySize} guests
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#F8F5F0] border border-[#E6DDD3]">
                      {restaurant.seatingManagementMode === 'individual_tables' ? 'Assigned Tables' : 'Seat Allocation'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="p-6 sm:p-7 pt-0">
                <div className="pt-4 border-t border-[#E6DDD3] flex items-center justify-between">
                  <span className="text-xs text-[#776B63]">
                    Available for <strong>{filterPartySize}</strong> {filterPartySize === 1 ? 'Guest' : 'Guests'}
                  </span>
                  <Link
                    href={`/restaurants/${restaurant.slug}?guests=${filterPartySize}&date=${initialDate}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#3B2924] hover:bg-[#795548] text-white text-xs font-semibold transition shadow-2xs"
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
    <Suspense fallback={<div className="p-16 text-center text-xs text-[#776B63]">Loading curated restaurant catalog...</div>}>
      <RestaurantListingContent />
    </Suspense>
  );
}

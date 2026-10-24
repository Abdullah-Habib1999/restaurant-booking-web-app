'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { Restaurant } from '@/types';
import { Store, Check, ArrowRight, ShieldCheck, MapPin } from 'lucide-react';

export default function RestaurantRegistrationPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [cuisine, setCuisine] = useState('Italian');
  const [totalSeats, setTotalSeats] = useState(50);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newRestaurant: Restaurant = {
      id: `rest-${Date.now()}`,
      ownerId: 'owner-new',
      name,
      slug,
      tagline: 'Authentic culinary experience & hospitality',
      description: 'Newly registered restaurant awaiting full menu curation.',
      cuisineType: [cuisine],
      phone,
      email,
      address,
      city,
      postalCode: '10001',
      coverImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
      priceTier: '$$',
      seatingManagementMode: 'individual_tables',
      totalSeatingCapacity: Number(totalSeats),
      slotDurationMinutes: 90,
      bufferTimeMinutes: 15,
      advanceBookingDays: 30,
      minPartySize: 1,
      maxPartySize: 12,
      cancellationPolicy: 'Free cancellation up to 2 hours prior.',
      cancellationCutoffHours: 2,
      requiresManualApproval: false,
      status: 'published',
      rating: 5.0,
      reviewCount: 1,
      createdAt: new Date().toISOString()
    };

    await db.saveRestaurant(newRestaurant);
    setIsSubmitting(false);
    setIsSuccess(true);
    setTimeout(() => {
      router.push('/owner/overview');
    }, 2000);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 space-y-8">
      
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#181513] border border-[#332A25] text-[#C6A47E] flex items-center justify-center mx-auto mb-3 shadow-md">
          <Store className="w-6 h-6 text-[#C6A47E]" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-[#F5F0E9]">
          Register Your Restaurant
        </h1>
        <p className="text-sm text-[#B7AAA0] mt-1">
          Join our reservation & pre-ordering dining network.
        </p>
      </div>

      {isSuccess ? (
        <div className="bg-[#181513] rounded-3xl border border-[#22543D] p-8 text-center shadow-2xl space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#132A1C] text-[#86EFAC] flex items-center justify-center mx-auto border border-[#22543D]">
            <Check className="w-6 h-6 text-[#86EFAC]" />
          </div>
          <h3 className="font-serif text-xl font-bold text-[#F5F0E9]">
            Restaurant Registered!
          </h3>
          <p className="text-xs text-[#B7AAA0]">
            Redirecting to your owner management dashboard...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-[#181513] rounded-3xl border border-[#332A25] p-6 sm:p-8 shadow-2xl space-y-5 text-xs">
          
          <div>
            <label className="block font-semibold uppercase text-[#8D8178] mb-1">Restaurant Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Maison Bellefeuille"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] font-semibold text-sm placeholder-[#8D8178] focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold uppercase text-[#8D8178] mb-1">Primary Cuisine</label>
              <input
                type="text"
                required
                placeholder="e.g. French, Japanese, Mediterranean"
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] placeholder-[#8D8178] focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-[#8D8178] mb-1">Total Seating Capacity</label>
              <input
                type="number"
                min={5}
                max={500}
                value={totalSeats}
                onChange={(e) => setTotalSeats(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] font-semibold focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold uppercase text-[#8D8178] mb-1">Contact Phone</label>
              <input
                type="tel"
                required
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] placeholder-[#8D8178] focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-[#8D8178] mb-1">Business Email</label>
              <input
                type="email"
                required
                placeholder="host@yourrestaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] placeholder-[#8D8178] focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold uppercase text-[#8D8178] mb-1">Street Address</label>
              <input
                type="text"
                required
                placeholder="123 Culinary Row"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] placeholder-[#8D8178] focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-[#8D8178] mb-1">City & State</label>
              <input
                type="text"
                required
                placeholder="New York, NY"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] placeholder-[#8D8178] focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-[#8B5E45] hover:bg-[#9E6C51] text-[#F5F0E9] font-semibold text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer mt-4 disabled:opacity-50"
          >
            {isSubmitting ? 'Registering...' : 'Register & Enter Dashboard'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

    </div>
  );
}

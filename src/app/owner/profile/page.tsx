'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { Restaurant } from '@/types';
import { Store, MapPin, Phone, Mail, Check, Upload } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';

export default function OwnerProfilePage() {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [cuisines, setCuisines] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const targetId = user?.ownedRestaurantId || 'rest-1';
      const rest = await db.getRestaurantById(targetId);
      if (rest) {
        setRestaurant(rest);
        setName(rest.name);
        setTagline(rest.tagline);
        setDescription(rest.description);
        setPhone(rest.phone);
        setEmail(rest.email);
        setAddress(rest.address);
        setCity(rest.city);
        setCoverImageUrl(rest.coverImageUrl);
        setCuisines(rest.cuisineType.join(', '));
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    const updated: Restaurant = {
      ...restaurant,
      name,
      tagline,
      description,
      phone,
      email,
      address,
      city,
      coverImageUrl,
      cuisineType: cuisines.split(',').map(s => s.trim()).filter(Boolean)
    };

    await db.saveRestaurant(updated);
    setRestaurant(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-[#6B625D]">Loading restaurant profile...</div>;
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#F5F0E9]">
          Restaurant Profile & Branding
        </h1>
        <p className="text-sm text-[#B7AAA0] mt-1">
          Public profile, culinary identity, cover media, and guest contact information.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-[#181513] rounded-3xl border border-[#332A25] p-6 sm:p-8 shadow-sm space-y-6">
        
        {/* Banner Preview */}
        <div className="relative h-48 w-full rounded-2xl overflow-hidden bg-[#151311] border border-[#332A25]">
          {coverImageUrl ? (
            <img src={coverImageUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-[#8D8178]">
              No cover photo set
            </div>
          )}
        </div>

        <div className="space-y-4 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold uppercase text-[#8D8178] mb-1">Restaurant Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] font-semibold text-sm focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-[#8D8178] mb-1">Tagline</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold uppercase text-[#8D8178] mb-1">Cuisines (comma separated)</label>
            <input
              type="text"
              value={cuisines}
              onChange={(e) => setCuisines(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
            />
          </div>

          <div>
            <label className="block font-semibold uppercase text-[#8D8178] mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold uppercase text-[#8D8178] mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-[#8D8178] mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold uppercase text-[#8D8178] mb-1">Street Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-[#8D8178] mb-1">City, State</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold uppercase text-[#8D8178] mb-1">Cover Image URL</label>
            <input
              type="url"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
            />
          </div>

        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[#332A25]">
          {saved ? (
            <span className="text-xs text-[#86EFAC] font-semibold flex items-center gap-1">
              <Check className="w-4 h-4" /> Profile updated successfully!
            </span>
          ) : <span />}

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-[#8B5E45] hover:bg-[#9E6C51] text-[#F5F0E9] text-xs font-semibold transition cursor-pointer shadow-sm"
          >
            Save Restaurant Profile
          </button>
        </div>

      </form>
    </div>
  );
}

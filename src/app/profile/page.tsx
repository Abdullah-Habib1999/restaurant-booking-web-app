'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { User, Mail, Phone, Check, LogOut, Store } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const { user, role, updateProfile, logout } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({ fullName, email, phone });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSignOut = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#F5F0E9]">
            Account Profile
          </h1>
          <p className="text-xs sm:text-sm text-[#B7AAA0] mt-1">
            Manage your dining contact details and preferences.
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#332A25] bg-[#151311] hover:bg-[#2E1212]/50 hover:text-rose-400 text-xs font-semibold text-[#8D8178] transition cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {role === 'restaurant_owner' && (
        <div className="bg-[#181513] rounded-2xl border border-[#332A25] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Store className="w-5 h-5 text-[#C6A47E]" />
            <div>
              <span className="text-xs font-bold text-[#F5F0E9]">Restaurant Partner Account</span>
              <p className="text-[11px] text-[#8D8178]">You have merchant privileges on TableReserve.</p>
            </div>
          </div>
          <Link
            href="/owner/overview"
            className="px-4 py-2 rounded-xl bg-[#8B5E45] text-[#F5F0E9] text-xs font-semibold hover:bg-[#9E6C51] transition"
          >
            Go to Console
          </Link>
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleSave} className="bg-[#181513] rounded-3xl border border-[#332A25] p-6 sm:p-8 shadow-2xl space-y-5">
        <h3 className="font-serif text-lg font-bold text-[#F5F0E9] border-b border-[#332A25] pb-3">
          Contact Information
        </h3>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold uppercase tracking-wider text-[#B7AAA0] mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#C6A47E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] text-sm focus:outline-hidden focus:border-[#8B5E45]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold uppercase tracking-wider text-[#B7AAA0] mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#C6A47E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] text-sm focus:outline-hidden focus:border-[#8B5E45]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold uppercase tracking-wider text-[#B7AAA0] mb-1">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#C6A47E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] text-sm focus:outline-hidden focus:border-[#8B5E45]"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[#332A25]">
          {saved ? (
            <span className="text-xs text-[#86EFAC] font-semibold flex items-center gap-1">
              <Check className="w-4 h-4 text-emerald-400" /> Changes saved successfully!
            </span>
          ) : <span />}

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#8B5E45] hover:bg-[#9E6C51] text-[#F5F0E9] text-xs font-semibold transition cursor-pointer shadow-md"
          >
            Save Changes
          </button>
        </div>
      </form>

    </div>
  );
}

import React from 'react';

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8 text-xs text-[#B7AAA0]">
      <h1 className="font-serif text-3xl font-bold text-[#F5F0E9]">Privacy Policy</h1>
      <p className="text-xs text-[#C6A47E]">Last updated: October 2026</p>

      <div className="space-y-6 leading-relaxed bg-[#181513] border border-[#332A25] p-8 rounded-3xl shadow-2xl">
        <div className="space-y-2">
          <h2 className="font-serif text-lg font-bold text-[#F5F0E9]">1. Information We Collect</h2>
          <p>
            We collect customer contact credentials (name, email, phone) strictly for the purpose of communicating dining reservations, booking confirmation references, and kitchen pre-order details with the selected restaurant.
          </p>
        </div>

        <div className="space-y-2 border-t border-[#332A25] pt-4">
          <h2 className="font-serif text-lg font-bold text-[#F5F0E9]">2. Restaurant Data Sharing</h2>
          <p>
            When you place a booking, your party size, arrival schedule, dietary requests, and pre-ordered dishes are transmitted to authorized kitchen and host staff at that restaurant.
          </p>
        </div>
      </div>
    </div>
  );
}

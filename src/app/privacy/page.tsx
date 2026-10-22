import React from 'react';

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8 text-xs text-[#776B63]">
      <h1 className="font-serif text-3xl font-bold text-[#201B18]">Privacy Policy</h1>
      <p className="text-xs">Last updated: October 2026</p>

      <div className="space-y-4 leading-relaxed">
        <h2 className="font-serif text-lg font-bold text-[#201B18]">1. Information We Collect</h2>
        <p>
          We collect customer contact credentials (name, email, phone) strictly for the purpose of communicating dining reservations, booking confirmation references, and kitchen pre-order details with the selected restaurant.
        </p>

        <h2 className="font-serif text-lg font-bold text-[#201B18]">2. Restaurant Data Sharing</h2>
        <p>
          When you place a booking, your party size, arrival schedule, dietary requests, and pre-ordered dishes are transmitted to authorized kitchen and host staff at that restaurant.
        </p>
      </div>
    </div>
  );
}

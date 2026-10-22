import React from 'react';

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8 text-xs text-[#776B63]">
      <h1 className="font-serif text-3xl font-bold text-[#201B18]">Terms of Service</h1>
      <p className="text-xs">Last updated: October 2026</p>

      <div className="space-y-4 leading-relaxed">
        <h2 className="font-serif text-lg font-bold text-[#201B18]">1. Platform Services</h2>
        <p>
          TableReserve provides an online reservation and advance culinary pre-ordering intermediary platform connecting customers with independently operated restaurants.
        </p>

        <h2 className="font-serif text-lg font-bold text-[#201B18]">2. Booking Integrity & Capacity Allocation</h2>
        <p>
          Reservations are allocated based on actual restaurant seating constraints. Diners agree to arrive on time. Tables are held for a maximum grace period of 15 minutes before the venue may reassign capacity.
        </p>

        <h2 className="font-serif text-lg font-bold text-[#201B18]">3. Pre-Order Pricing & Billing</h2>
        <p>
          Pre-ordered items reflect the menu price at the exact moment of reservation. Taxes and gratuities are estimated and settled on premise.
        </p>
      </div>
    </div>
  );
}

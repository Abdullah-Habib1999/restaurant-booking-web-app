import React from 'react';
import Link from 'next/link';

export default function CancellationPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8 text-xs text-[#776B63]">
      <h1 className="font-serif text-3xl font-bold text-[#201B18]">Booking and Cancellation Policy</h1>
      <p className="text-xs">Standard Guidelines for Diners & Venues</p>

      <div className="space-y-4 leading-relaxed">
        <h2 className="font-serif text-lg font-bold text-[#201B18]">1. Transparent Seating Release</h2>
        <p>
          Every reservation holds physical table capacity. If your plans change, we ask that you cancel your reservation as early as possible so that other guests may dine.
        </p>

        <h2 className="font-serif text-lg font-bold text-[#201B18]">2. Cancellation Windows</h2>
        <p>
          Most restaurant partners allow complimentary cancellation up to 2 hours prior to your scheduled arrival. Specific policies set by individual venues are displayed clearly during the reservation flow.
        </p>

        <h2 className="font-serif text-lg font-bold text-[#201B18]">3. Pre-Order Adjustments</h2>
        <p>
          When you cancel an advance booking, pre-ordered culinary courses are automatically removed from the kitchen prep queue.
        </p>
      </div>
    </div>
  );
}

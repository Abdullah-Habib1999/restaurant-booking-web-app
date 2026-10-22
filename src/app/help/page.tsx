import React from 'react';
import Link from 'next/link';
import { Mail, Phone, HelpCircle } from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
      <div className="text-center space-y-2">
        <h1 className="font-serif text-3xl font-bold text-[#201B18]">
          Help & Customer Support
        </h1>
        <p className="text-xs sm:text-sm text-[#776B63]">
          Assistance with reservations, pre-orders, and dining policies.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-[#E6DDD3] p-8 shadow-xs space-y-6 text-xs text-[#776B63]">
        <div className="space-y-2">
          <h3 className="font-serif text-base font-bold text-[#201B18]">How do I modify or cancel a reservation?</h3>
          <p className="leading-relaxed">
            You can view and cancel any active booking in <Link href="/my-bookings" className="text-[#3B2924] font-semibold underline">My Bookings</Link> up until the restaurant's designated cancellation cutoff window (typically 2 to 4 hours prior).
          </p>
        </div>

        <div className="space-y-2 border-t border-[#E6DDD3] pt-4">
          <h3 className="font-serif text-base font-bold text-[#201B18]">When is payment taken for pre-orders?</h3>
          <p className="leading-relaxed">
            TableReserve calculates an itemized estimated total on the platform. Final billing and payment collection are handled at the restaurant upon dining, so you can easily add extra beverages or items on site.
          </p>
        </div>

        <div className="space-y-2 border-t border-[#E6DDD3] pt-4">
          <h3 className="font-serif text-base font-bold text-[#201B18]">Contact TableReserve Concierge</h3>
          <p className="leading-relaxed">
            Need urgent assistance with a high-capacity booking or special dietary inquiry?
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-4 text-xs font-semibold text-[#201B18]">
            <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-[#795548]" /> support@tablereserve.com</span>
            <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-[#795548]" /> +1 (800) 555-DINE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

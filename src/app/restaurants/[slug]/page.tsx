'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar as CalendarIcon, 
  Users, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  ShieldAlert, 
  Plus, 
  Minus, 
  ShoppingBag, 
  Check, 
  Info, 
  ArrowRight,
  Sparkles,
  ChevronLeft,
  ChevronDown,
  AlertCircle,
  Star
} from 'lucide-react';
import { db } from '@/lib/db';
import { 
  Restaurant, 
  MenuCategory, 
  MenuItem, 
  TimeSlotAvailability,
  RestaurantHours, 
  TableSeatStatus 
} from '@/types';
import { useAuth } from '@/context/AuthContext';
import { Suspense } from 'react';
import InteractiveSeatingMap from '@/components/InteractiveSeatingMap';
import RestaurantReviewsSection from '@/components/RestaurantReviewsSection';

function RestaurantDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const slug = params.slug as string;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [hours, setHours] = useState<RestaurantHours[]>([]);
  const [loading, setLoading] = useState(true);

  // Seating Map State
  const [tableSeats, setTableSeats] = useState<TableSeatStatus[]>([]);
  const [loadingSeatMap, setLoadingSeatMap] = useState<boolean>(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [seatHoldToken, setSeatHoldToken] = useState<string | null>(null);

  // Booking Parameters (Dynamically initialized to current date)
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const [visitDate, setVisitDate] = useState<string>(
    searchParams.get('date') || todayStr
  );
  const [partySize, setPartySize] = useState<number>(
    Number(searchParams.get('guests')) || 2
  );
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlotAvailability[]>([]);
  const [checkingSlots, setCheckingSlots] = useState(false);

  // Active Menu Category Filter
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Pre-Order Cart: Map<menuItemId, quantity>
  const [cart, setCart] = useState<{ [itemId: string]: number }>({});
  const [specialRequests, setSpecialRequests] = useState('');

  // Flow State & Submission
  const [step, setStep] = useState<'details' | 'preorder' | 'review' | 'confirmed'>('details');
  const [customerName, setCustomerName] = useState(user?.fullName || 'Eleanor Vance');
  const [customerEmail, setCustomerEmail] = useState(user?.email || 'eleanor.vance@example.com');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '+1 (555) 234-9988');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedBookingReference, setConfirmedBookingReference] = useState<string | null>(null);

  // Active Booking Detection & Modal State
  const [activeBooking, setActiveBooking] = useState<any | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showWeeklyHours, setShowWeeklyHours] = useState(false);

  // Compute Today's Opening Hours (with guaranteed fallback)
  const todaySchedule = useMemo(() => {
    const currentDay = new Date().getDay();
    if (hours && hours.length > 0) {
      const found = hours.find(h => h.dayOfWeek === currentDay);
      if (found) return found;
    }
    return { dayOfWeek: currentDay, openTime: '12:00', closeTime: '23:00', isClosed: false };
  }, [hours]);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Load Restaurant & Menu Data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const rest = await db.getRestaurantBySlug(slug);
      if (rest) {
        setRestaurant(rest);
        const [cats, items, restHours] = await Promise.all([
          db.getMenuCategories(rest.id),
          db.getMenuItems(rest.id),
          db.getRestaurantHours(rest.id)
        ]);
        setCategories(cats);
        setMenuItems(items);
        setHours(restHours);
      }
      setLoading(false);
    };
    load();
  }, [slug]);

  // Check for active booking for this customer at this restaurant
  const checkActiveBooking = async () => {
    if (!restaurant) return;
    const custId = user?.id || 'cust-1';
    const existing = await db.getActiveBookingForCustomer(restaurant.id, custId);
    setActiveBooking(existing);
    return existing;
  };

  useEffect(() => {
    if (restaurant) {
      checkActiveBooking();
    }
  }, [restaurant, user]);

  // Recalculate Available Slots when date or partySize changes, and auto-refresh every 5 seconds for live cross-user drops
  useEffect(() => {
    if (!restaurant) return;
    let isSubscribed = true;

    const fetchSlots = async (isBackground = false) => {
      if (!isBackground) setCheckingSlots(true);
      const slots = await db.checkSlotAvailability(restaurant.id, visitDate, partySize);
      if (isSubscribed) {
        setAvailableSlots(slots);
        if (!isBackground) setCheckingSlots(false);
      }
    };

    // Initial load
    fetchSlots(false);

    // Live polling every 5s so when other users reserve seats, seat counts drop in real-time
    const interval = setInterval(() => {
      fetchSlots(true);
    }, 5000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [restaurant, visitDate, partySize]);

  // Load real-time Seating Map whenever restaurant, visitDate, or selectedSlot changes
  useEffect(() => {
    if (!restaurant) return;
    let isSubscribed = true;

    const loadSeatMap = async () => {
      setLoadingSeatMap(true);
      try {
        const data = await db.getTableSeatsAvailability(
          restaurant.id, 
          visitDate, 
          selectedSlot || undefined, 
          partySize
        );
        if (isSubscribed) {
          setTableSeats(data);
          // If a table is already selected, verify it's still available
          if (selectedTableId) {
            const currentTab = data.find(t => t.tableId === selectedTableId);
            if (!currentTab || currentTab.status === 'booked' || currentTab.status === 'unavailable') {
              setSelectedTableId(null);
              setSelectedSeats([]);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load seating map:', err);
      } finally {
        if (isSubscribed) setLoadingSeatMap(false);
      }
    };

    loadSeatMap();

    // Auto-refresh every 8s to catch real-time seat holds and bookings by other customers
    const timer = setInterval(loadSeatMap, 8000);
    return () => {
      isSubscribed = false;
      clearInterval(timer);
    };
  }, [restaurant, visitDate, selectedSlot, partySize]);

  // Handle table selection on floor plan
  const handleSelectTable = (tableId: string, initialSeats?: number[]) => {
    const table = tableSeats.find(t => t.tableId === tableId);
    if (!table || table.status === 'booked' || table.status === 'unavailable') return;

    if (selectedTableId === tableId) {
      // Toggle off
      setSelectedTableId(null);
      setSelectedSeats([]);
      if (seatHoldToken) {
        db.releaseHold(seatHoldToken);
        setSeatHoldToken(null);
      }
      return;
    }

    setSelectedTableId(tableId);
    
    // Auto-select required party size seats if available, or use initialSeats
    if (initialSeats && initialSeats.length > 0) {
      setSelectedSeats(initialSeats);
    } else {
      const availSeats = table.seats.filter(s => s.status === 'available').map(s => s.seatNumber);
      const seatsToPick = availSeats.slice(0, partySize);
      setSelectedSeats(seatsToPick);

      // Attempt temporary hold
      if (restaurant && selectedSlot && seatsToPick.length > 0) {
        db.holdSeats({
          restaurantId: restaurant.id,
          tableId,
          reservationDate: visitDate,
          startTime: selectedSlot,
          seatNumbers: seatsToPick,
          customerId: user?.id || 'cust-1'
        }).then(res => {
          if (res.success && res.holdToken) {
            setSeatHoldToken(res.holdToken);
          }
        });
      }
    }
  };

  // Handle individual seat selection cinema-style
  const handleSelectSeat = (tableId: string, seatNumber: number) => {
    const table = tableSeats.find(t => t.tableId === tableId);
    if (!table) return;

    const seat = table.seats.find(s => s.seatNumber === seatNumber);
    if (!seat || seat.status === 'booked' || seat.status === 'unavailable') return;

    if (selectedTableId !== tableId) {
      setSelectedTableId(tableId);
      setSelectedSeats([seatNumber]);
      return;
    }

    // Same table: toggle seat
    let updatedSeats: number[];
    if (selectedSeats.includes(seatNumber)) {
      updatedSeats = selectedSeats.filter(s => s !== seatNumber);
    } else {
      if (selectedSeats.length >= partySize) {
        // Replace oldest or replace all if party size reached
        updatedSeats = [...selectedSeats.slice(1), seatNumber];
      } else {
        updatedSeats = [...selectedSeats, seatNumber];
      }
    }
    setSelectedSeats(updatedSeats);

    // Hold update
    if (restaurant && selectedSlot && updatedSeats.length > 0) {
      db.holdSeats({
        restaurantId: restaurant.id,
        tableId,
        reservationDate: visitDate,
        startTime: selectedSlot,
        seatNumbers: updatedSeats,
        customerId: user?.id || 'cust-1'
      }).then(res => {
        if (res.success && res.holdToken) {
          setSeatHoldToken(res.holdToken);
        }
      });
    }
  };

  // Cart operations
  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      const current = prev[itemId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  // Cart calculations
  const cartItemsList = useMemo(() => {
    return Object.entries(cart).map(([itemId, qty]) => {
      const item = menuItems.find(m => m.id === itemId);
      return {
        item,
        quantity: qty,
        lineTotal: item ? item.price * qty : 0
      };
    }).filter(i => i.item !== undefined);
  }, [cart, menuItems]);

  const subtotal = useMemo(() => {
    return cartItemsList.reduce((acc, curr) => acc + curr.lineTotal, 0);
  }, [cartItemsList]);

  const tax = Number((subtotal * 0.08875).toFixed(2));
  const estimatedTotal = Number((subtotal + tax).toFixed(2));

  // Trigger Booking: checks if an active booking exists first
  const handleInitiateBooking = async () => {
    if (!restaurant || !selectedSlot) return;
    
    // Check if customer already has a pending or confirmed booking
    const existing = await checkActiveBooking();
    if (existing) {
      // Pop up confirmation dialog
      setShowDuplicateModal(true);
      return;
    }

    // Otherwise proceed with creation directly
    await executeBooking();
  };

  // Perform actual reservation creation
  const executeBooking = async () => {
    if (!restaurant || !selectedSlot) return;
    setIsSubmitting(true);
    setBookingError(null);
    setShowDuplicateModal(false);

    const itemsPayload = Object.entries(cart).map(([menuItemId, quantity]) => ({
      menuItemId,
      quantity
    }));

    const result = await db.createReservation({
      restaurantId: restaurant.id,
      customerId: user?.id || 'cust-1',
      customerName,
      customerEmail,
      customerPhone,
      partySize,
      reservationDate: visitDate,
      startTime: selectedSlot,
      specialRequests,
      selectedTableId: selectedTableId || undefined,
      selectedSeats: selectedSeats.length > 0 ? selectedSeats : undefined,
      items: itemsPayload
    });

    setIsSubmitting(false);

    if (result.success && result.reservation) {
      setConfirmedBookingReference(result.reservation.bookingReference);
      setStep('confirmed');
      // Refresh available slots and seat map immediately
      const [slots, seatData] = await Promise.all([
        db.checkSlotAvailability(restaurant.id, visitDate, partySize),
        db.getTableSeatsAvailability(restaurant.id, visitDate, selectedSlot, partySize)
      ]);
      setAvailableSlots(slots);
      setTableSeats(seatData);
      checkActiveBooking();
    } else {
      setBookingError(result.error || 'Failed to complete booking. Please try another time.');
      // Refresh seat map to reveal what became booked/held
      const seatData = await db.getTableSeatsAvailability(restaurant.id, visitDate, selectedSlot, partySize);
      setTableSeats(seatData);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-[#6B625D]">
        Loading restaurant experience...
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-[#1C1C1C]">Restaurant Not Found</h2>
        <p className="text-sm text-[#6B625D] mt-2">The requested dining venue does not exist or has been unpublished.</p>
        <Link href="/restaurants" className="mt-4 inline-block text-sm text-[#795548] font-semibold underline">
          Return to restaurants
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      {/* Back button */}
      <Link
        href="/restaurants"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B625D] hover:text-[#1C1C1C] transition"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Restaurants
      </Link>

      {/* CONFIRMED STATE */}
      {step === 'confirmed' && (
        <div className="bg-white rounded-3xl border border-[#E8E1DA] p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-lg space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-emerald-700">
              Booking Confirmed
            </span>
            <h2 className="font-serif text-3xl font-bold text-[#1C1C1C] mt-1">
              We look forward to welcoming you!
            </h2>
            <p className="text-sm text-[#6B625D] mt-2">
              Your reservation and kitchen pre-order at <strong className="text-[#1C1C1C]">{restaurant.name}</strong> has been secured.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E1DA] text-left space-y-2 text-sm">
            <div className="flex justify-between border-b border-[#E8E1DA]/80 pb-2">
              <span className="text-[#6B625D]">Booking Reference:</span>
              <strong className="font-mono text-base text-[#4E342E]">{confirmedBookingReference}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B625D]">Date & Time:</span>
              <strong className="text-[#1C1C1C]">{visitDate} at {selectedSlot}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B625D]">Party Size:</span>
              <strong className="text-[#1C1C1C]">{partySize} {partySize === 1 ? 'Guest' : 'Guests'}</strong>
            </div>
            {selectedTableId && (
              <div className="flex justify-between items-center bg-[#F4EBE1]/60 px-2.5 py-1.5 rounded-lg border border-[#795548]/20">
                <span className="text-[#4E342E] font-medium">Selected Table & Seats:</span>
                <span className="font-bold text-[#4E342E]">
                  {tableSeats.find(t => t.tableId === selectedTableId)?.tableNumber || 'Assigned Table'}
                  {selectedSeats.length > 0 && ` • Seats: ${selectedSeats.map(s => `#${s}`).join(', ')}`}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#6B625D]">Pre-Ordered Items:</span>
              <strong className="text-[#1C1C1C]">{cartItemsList.length} dishes</strong>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#E8E1DA]/80">
              <span className="text-[#6B625D]">Estimated Pre-Order Total:</span>
              <strong className="text-base text-[#1C1C1C]">${estimatedTotal.toFixed(2)}</strong>
            </div>
          </div>

          <p className="text-xs text-[#6B625D] leading-relaxed">
            Payment for pre-orders and any added items is settled at the venue upon dining. 
            Cancellations are accepted without fee up to {restaurant.cancellationCutoffHours} hours in advance.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/my-bookings"
              className="px-6 py-2.5 rounded-xl bg-[#4E342E] hover:bg-[#795548] text-white text-sm font-semibold transition shadow-xs"
            >
              View in My Bookings
            </Link>
            <Link
              href="/restaurants"
              className="px-6 py-2.5 rounded-xl bg-[#FAF9F6] hover:bg-[#E8E1DA] text-[#1C1C1C] text-sm font-medium border border-[#E8E1DA] transition"
            >
              Explore More Restaurants
            </Link>
          </div>
        </div>
      )}

      {/* ACTIVE RESERVATION & PRE-ORDER WORKFLOW */}
      {step !== 'confirmed' && (
        <div className="space-y-10">
          
          {/* Header Hero Banner */}
          <div className="bg-white rounded-3xl border border-[#E8E1DA] overflow-hidden shadow-xs">
            <div className="relative h-64 sm:h-80 w-full bg-gray-100">
              <img
                src={restaurant.coverImageUrl}
                alt={restaurant.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {restaurant.cuisineType.map(c => (
                    <span key={c} className="px-2.5 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-xs font-medium">
                      {c}
                    </span>
                  ))}
                  <span className="px-2.5 py-0.5 rounded-md bg-[#795548] text-xs font-semibold">
                    {restaurant.priceTier}
                  </span>
                  <div className="px-3 py-0.5 rounded-md bg-white/95 backdrop-blur-md text-[#201B18] text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
                    {restaurant.reviewCount && restaurant.reviewCount > 0 ? (
                      <>
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>{restaurant.rating?.toFixed(1)}/5</span>
                        <span className="text-[#6B625D] font-normal">
                          ({restaurant.reviewCount} verified {restaurant.reviewCount === 1 ? 'review' : 'reviews'})
                        </span>
                      </>
                    ) : (
                      <>
                        <Star className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-[#6B625D]">No reviews yet</span>
                      </>
                    )}
                  </div>
                </div>
                <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
                  {restaurant.name}
                </h1>
                <p className="text-sm text-gray-200 mt-1">
                  {restaurant.tagline}
                </p>
              </div>
            </div>

            {/* Quick Details Bar */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-b border-[#E8E1DA] bg-[#FAF9F6]/50 text-xs text-[#6B625D]">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#795548] shrink-0" />
                <span>{restaurant.address}, {restaurant.city}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#795548] shrink-0" />
                <span>{restaurant.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#795548] shrink-0" />
                <span>Capacity: {restaurant.totalSeatingCapacity} seats</span>
              </div>
              
              {/* Live Opening Hours & Weekly Schedule Dropdown */}
              <div className="relative">
                <div 
                  onClick={() => setShowWeeklyHours(prev => !prev)}
                  className="flex items-center justify-between gap-1.5 cursor-pointer hover:text-[#201B18] transition p-1.5 -m-1.5 rounded-lg hover:bg-white border border-transparent hover:border-[#E8E1DA]"
                  title="Click to view weekly schedule"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#795548] shrink-0" />
                    <div>
                      {todaySchedule ? (
                        todaySchedule.isClosed ? (
                          <span className="font-semibold text-rose-700">Closed Today</span>
                        ) : (
                          <span>
                            <strong className="text-emerald-700 font-semibold">Open: </strong>
                            {todaySchedule.openTime} – {todaySchedule.closeTime}
                          </span>
                        )
                      ) : (
                        <span>Hours loading...</span>
                      )}
                    </div>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#795548] transition-transform ${showWeeklyHours ? 'rotate-180' : ''}`} />
                </div>

                {/* Weekly Hours Popover */}
                {showWeeklyHours && (
                  <div className="absolute right-0 top-full mt-2 w-64 p-3.5 bg-white rounded-2xl border border-[#E8E1DA] shadow-xl z-30 text-xs space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between border-b border-[#E8E1DA] pb-1.5 font-bold text-[#201B18]">
                      <span>Weekly Operating Hours</span>
                      <span className="text-[10px] text-[#795548] font-normal">7-Day Schedule</span>
                    </div>
                    <div className="space-y-1.5">
                      {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
                        const dayH = (hours && hours.length > 0 ? hours.find(h => h.dayOfWeek === dayIndex) : null) || {
                          dayOfWeek: dayIndex,
                          openTime: '12:00',
                          closeTime: '23:00',
                          isClosed: false
                        };
                        const isToday = new Date().getDay() === dayIndex;
                        return (
                          <div 
                            key={dayIndex}
                            className={`flex justify-between items-center py-0.5 px-1.5 rounded-md ${
                              isToday ? 'bg-[#FAF6F0] font-bold text-[#3B2924]' : 'text-[#6B625D]'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              {dayNames[dayIndex]}
                              {isToday && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>}
                            </span>
                            <span>
                              {!dayH || dayH.isClosed ? (
                                <span className="text-rose-600 font-medium">Closed</span>
                              ) : (
                                `${dayH.openTime} – ${dayH.closeTime}`
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6">
              <h3 className="font-serif text-base font-bold text-[#1C1C1C]">About the Venue</h3>
              <p className="text-sm text-[#6B625D] mt-2 leading-relaxed">
                {restaurant.description}
              </p>
              <div className="mt-4 p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E1DA] text-xs text-[#6B625D] flex items-start gap-2">
                <Info className="w-4 h-4 text-[#795548] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[#1C1C1C]">Cancellation Policy: </span>
                  {restaurant.cancellationPolicy}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: CINEMA BOOKING INTERFACE (Desktop: 2-column, Mobile: Booking details -> Seating Map -> Contact/Pre-Order -> Submit) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: Booking Parameters & Checkout */}
            <div className="lg:col-span-5 space-y-6 order-1">
              <div className="bg-white rounded-3xl border border-[#E8E1DA] p-6 shadow-md space-y-6">
                
                <div className="border-b border-[#E8E1DA] pb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#795548]">
                    Reservation Details • Cinema-Style Selection
                  </span>
                  <h3 className="font-serif text-xl font-bold text-[#1C1C1C] mt-0.5">
                    Reserve Your Table & Seats
                  </h3>
                </div>

                {/* Step 1: Date & Guests Selection */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B625D] mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={visitDate}
                        min={todayStr}
                        onChange={(e) => setVisitDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#E8E1DA] text-xs font-medium text-[#1C1C1C] bg-[#FAF9F6]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B625D] mb-1">
                        Party Size
                      </label>
                      <select
                        value={partySize}
                        onChange={(e) => setPartySize(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-[#E8E1DA] text-xs font-medium text-[#1C1C1C] bg-[#FAF9F6]"
                      >
                        {[1, 2, 3, 4, 5, 6, 8, 10, 12, 14].map(num => (
                          <option key={num} value={num}>
                            {num} {num === 1 ? 'Guest' : 'Guests'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Slots with Genuine Availability Indicators */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B625D]">
                        Available Time Slots
                      </label>
                      <span className="text-[10px] text-[#795548]">
                        Slot Duration: {restaurant.slotDurationMinutes} mins
                      </span>
                    </div>

                    {checkingSlots ? (
                      <div className="text-xs text-[#6B625D] py-4 text-center animate-pulse flex items-center justify-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-[#795548] border-t-transparent rounded-full animate-spin"></span>
                        Checking live table availability...
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="p-3.5 rounded-xl bg-amber-50 text-amber-900 text-xs border border-amber-200 space-y-1">
                        <div className="font-semibold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          <span>Restaurant Closed or Fully Booked</span>
                        </div>
                        <p className="text-[11px] text-amber-800">
                          {restaurant.name} has no available reservation slots on {visitDate}. Please select another date or check weekly hours above.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                        {availableSlots.map(slot => (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!slot.isAvailable}
                            onClick={() => setSelectedSlot(slot.time)}
                            className={`p-2 rounded-xl text-xs font-medium transition cursor-pointer flex flex-col items-center justify-center border ${
                              selectedSlot === slot.time
                                ? 'bg-[#4E342E] text-white border-[#4E342E] shadow-xs'
                                : slot.isAvailable
                                ? 'bg-[#FAF9F6] hover:bg-[#E8E1DA]/40 text-[#1C1C1C] border-[#E8E1DA]'
                                : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                            }`}
                            title={slot.reason || `${slot.remainingSeats} seats available`}
                          >
                            <span>{slot.formattedTime}</span>
                            <span className={`text-[9px] mt-0.5 ${selectedSlot === slot.time ? 'text-gray-200' : 'text-[#795548]'}`}>
                              {slot.isAvailable ? `${slot.remainingSeats} seats` : 'Full'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected Seats & Table Status (Cinema-style badge) */}
                  <div className="p-3 rounded-2xl bg-[#F8F5F0] border border-[#E8E1DA] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#795548] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#795548]" />
                        Seat & Table Selection
                      </span>
                      {selectedTableId && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTableId(null);
                            setSelectedSeats([]);
                            if (seatHoldToken) {
                              db.releaseHold(seatHoldToken);
                              setSeatHoldToken(null);
                            }
                          }}
                          className="text-[11px] text-[#795548] hover:text-[#3B2924] underline cursor-pointer"
                        >
                          Change
                        </button>
                      )}
                    </div>

                    {selectedTableId ? (
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between font-semibold text-[#3B2924]">
                          <span>Table:</span>
                          <span>{tableSeats.find(t => t.tableId === selectedTableId)?.tableNumber || 'Selected Table'} ({tableSeats.find(t => t.tableId === selectedTableId)?.locationArea})</span>
                        </div>
                        <div className="flex items-center justify-between text-[#6B625D]">
                          <span>Cinema Seats:</span>
                          <div className="flex gap-1 flex-wrap justify-end">
                            {selectedSeats.length > 0 ? (
                              selectedSeats.map(s => (
                                <span key={s} className="px-2 py-0.5 rounded-md bg-[#3B2924] text-white text-[10px] font-bold">
                                  Seat #{s}
                                </span>
                              ))
                            ) : (
                              <span className="text-amber-800 font-medium">Whole Table</span>
                            )}
                          </div>
                        </div>
                        {seatHoldToken && (
                          <div className="pt-1 text-[10px] text-amber-800 flex items-center gap-1 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                            Held exclusively for you while booking is completed
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-[#795548] italic">
                        Choose your preferred seats or table from the interactive map.
                      </p>
                    )}
                  </div>
                </div>

                {/* MOBILE ONLY: Seating map appears immediately after booking details on small screens */}
                <div className="block lg:hidden pt-2 border-t border-[#E8E1DA]">
                  <InteractiveSeatingMap
                    restaurantName={restaurant.name}
                    tables={tableSeats}
                    partySize={partySize}
                    selectedTableId={selectedTableId}
                    selectedSeats={selectedSeats}
                    onSelectTable={handleSelectTable}
                    onSelectSeat={handleSelectSeat}
                    isLoading={loadingSeatMap}
                  />
                </div>

                {/* Order Summary Preview */}
                <div className="border-t border-[#E8E1DA] pt-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#1C1C1C]">
                    <span>Pre-Order Summary ({cartItemsList.length} items)</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>

                  {cartItemsList.length > 0 ? (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {cartItemsList.map(({ item, quantity, lineTotal }) => (
                        <div key={item!.id} className="flex justify-between text-xs text-[#6B625D]">
                          <span>{quantity}x {item!.name}</span>
                          <span>${lineTotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#6B625D] italic">
                      No food pre-ordered yet. You can order upon arrival or add items from the menu.
                    </p>
                  )}

                  <div className="border-t border-[#E8E1DA]/70 pt-2 space-y-1 text-xs">
                    <div className="flex justify-between text-[#6B625D]">
                      <span>Estimated Tax (8.875%):</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-[#1C1C1C] pt-1">
                      <span>Estimated Total:</span>
                      <span>${estimatedTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Customer Contact Details */}
                <div className="border-t border-[#E8E1DA] pt-4 space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B625D]">
                    Customer Contact
                  </span>

                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="block text-[#6B625D] mb-0.5">Full Name</label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-[#E8E1DA] bg-[#FAF9F6] text-[#1C1C1C]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[#6B625D] mb-0.5">Email</label>
                        <input
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-[#E8E1DA] bg-[#FAF9F6] text-[#1C1C1C]"
                        />
                      </div>
                      <div>
                        <label className="block text-[#6B625D] mb-0.5">Phone</label>
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-[#E8E1DA] bg-[#FAF9F6] text-[#1C1C1C]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[#6B625D] mb-0.5">Special Dietary / Seating Request</label>
                      <textarea
                        rows={2}
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        placeholder="e.g. Anniversary celebration, peanut allergy, window seat preference"
                        className="w-full px-3 py-1.5 rounded-xl border border-[#E8E1DA] bg-[#FAF9F6] text-[#1C1C1C] text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Error Banner */}
                {bookingError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{bookingError}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="button"
                  disabled={!selectedSlot || isSubmitting}
                  onClick={handleInitiateBooking}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                    selectedSlot && !isSubmitting
                      ? 'bg-[#4E342E] hover:bg-[#795548] text-white'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <span>Reserving Table & Locking Order...</span>
                  ) : !selectedSlot ? (
                    <span>Select a Time Slot Above</span>
                  ) : (
                    <>
                      <span>Confirm Reservation & Pre-Order</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <p className="text-[11px] text-[#6B625D] text-center leading-relaxed">
                  By booking, you agree to {restaurant.name}’s reservation policy. No pre-payment is deducted now; settlement occurs at the restaurant.
                </p>

              </div>
            </div>

            {/* RIGHT COLUMN: Interactive Seating Map for Desktop (~55% / 7 cols) */}
            <div className="hidden lg:block lg:col-span-7 sticky top-20 order-2">
              <InteractiveSeatingMap
                restaurantName={restaurant.name}
                tables={tableSeats}
                partySize={partySize}
                selectedTableId={selectedTableId}
                selectedSeats={selectedSeats}
                onSelectTable={handleSelectTable}
                onSelectSeat={handleSelectSeat}
                isLoading={loadingSeatMap}
              />
            </div>

          </div>

        {/* SECTION: FULL MENU & ADVANCE PRE-ORDER */}
        <div className="bg-white rounded-3xl border border-[#E8E1DA] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#1C1C1C]">
                Chef’s Menu & Advance Pre-Order
              </h2>
              <p className="text-xs text-[#6B625D] mt-1">
                Select courses in advance to guarantee kitchen prep upon your arrival, or skip and order at the table.
              </p>
            </div>

            {cartItemsList.length > 0 && (
              <div className="flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-[#FAF9F6] border border-[#795548]/30 text-[#4E342E]">
                <ShoppingBag className="w-4 h-4 text-[#795548]" />
                {cartItemsList.length} items in pre-order (${subtotal.toFixed(2)})
              </div>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#E8E1DA]">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-[#4E342E] text-white font-semibold'
                  : 'bg-[#FAF9F6] text-[#6B625D] hover:text-[#1C1C1C]'
              }`}
            >
              All Categories ({menuItems.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-[#4E342E] text-white font-semibold'
                    : 'bg-[#FAF9F6] text-[#6B625D] hover:text-[#1C1C1C]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Items List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {menuItems
              .filter(m => activeCategory === 'all' || m.categoryId === activeCategory)
              .map(item => {
                const qty = cart[item.id] || 0;
                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center ${
                      qty > 0 
                        ? 'bg-[#FAF9F6] border-[#795548]/40 shadow-xs' 
                        : 'bg-white border-[#E8E1DA]/80 hover:border-[#E8E1DA]'
                    } ${!item.isAvailable ? 'opacity-60 bg-gray-50' : ''}`}
                  >
                    {/* Image & Text */}
                    <div className="flex gap-4 items-start flex-1">
                      {item.imageUrl && (
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-serif font-bold text-base text-[#1C1C1C]">
                            {item.name}
                          </h4>
                          {item.isVegetarian && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold flex items-center gap-1 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block"></span>
                              Vegetarian
                            </span>
                          )}
                          {item.isNonVegetarian && (
                            <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 text-[10px] font-semibold flex items-center gap-1 border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block"></span>
                              Non-Veg
                            </span>
                          )}
                          {item.isGlutenFree && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-semibold">
                              Gluten-Free
                            </span>
                          )}
                          {!item.isAvailable && (
                            <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-bold">
                              Sold Out
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#6B625D] mt-1 leading-relaxed">
                          {item.description}
                        </p>
                        {item.preparationNotes && (
                          <p className="text-[11px] text-[#795548] mt-1 italic">
                            Note: {item.preparationNotes}
                          </p>
                        )}
                        <div className="mt-2 font-semibold text-sm text-[#1C1C1C]">
                          ${item.price.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="shrink-0 self-end sm:self-center">
                      {!item.isAvailable ? (
                        <span className="text-xs text-red-600 font-medium">Currently Unavailable</span>
                      ) : qty === 0 ? (
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="px-3.5 py-1.5 rounded-xl border border-[#795548] text-[#795548] hover:bg-[#795548] hover:text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 bg-white border border-[#E8E1DA] rounded-xl p-1 shadow-xs">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-7 h-7 rounded-lg hover:bg-[#FAF9F6] text-[#4E342E] flex items-center justify-center transition cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center font-bold text-sm text-[#1C1C1C]">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-7 h-7 rounded-lg hover:bg-[#FAF9F6] text-[#4E342E] flex items-center justify-center transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

      </div>
    )}

      {/* DEDICATED REVIEWS & RATINGS SECTION */}
      {step !== 'confirmed' && (
        <RestaurantReviewsSection
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
        />
      )}

      {/* POPUP: EXISTING BOOKING CONFIRMATION MODAL */}
      {showDuplicateModal && activeBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-[#E8E1DA] shadow-2xl relative space-y-6">
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6 text-amber-700" />
              </div>
              <div className="flex-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md inline-block">
                  Active Booking Found
                </span>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1C1C1C] mt-1.5">
                  You already have a booking here!
                </h3>
                <p className="text-xs sm:text-sm text-[#6B625D] mt-1">
                  There is currently an active reservation under your profile for <strong className="text-[#1C1C1C]">{restaurant.name}</strong>.
                </p>
              </div>
            </div>

            {/* Existing Booking Summary Card */}
            <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E1DA] text-xs space-y-2">
              <div className="flex justify-between items-center border-b border-[#E8E1DA]/80 pb-2">
                <span className="text-[#6B625D]">Reference:</span>
                <span className="font-mono font-bold text-[#4E342E]">{activeBooking.bookingReference}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B625D]">Existing Date & Time:</span>
                <strong className="text-[#1C1C1C]">{activeBooking.reservationDate} at {activeBooking.startTime}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B625D]">Guests:</span>
                <span className="text-[#1C1C1C] font-medium">{activeBooking.partySize} guests</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B625D]">Status:</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                  {activeBooking.status}
                </span>
              </div>
            </div>

            <div className="text-xs text-[#6B625D] leading-relaxed bg-[#F8F5F0] p-3 rounded-xl border border-[#E9DFD2]">
              <strong className="text-[#3B2924]">Do you want to create a new additional booking?</strong>
              <p className="mt-0.5">
                Creating an additional reservation will allocate separate table capacity for <span className="text-[#3B2924] font-semibold">{visitDate} at {selectedSlot}</span>.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={executeBooking}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-xl bg-[#4E342E] hover:bg-[#795548] text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                {isSubmitting ? 'Creating New Booking...' : 'Yes, Create New Booking'}
              </button>
              <Link
                href="/my-bookings"
                className="py-3 px-4 rounded-xl bg-[#FAF9F6] hover:bg-[#E8E1DA] text-[#1C1C1C] text-xs font-semibold border border-[#E8E1DA] text-center transition"
              >
                View Existing in My Bookings
              </Link>
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="py-3 px-4 rounded-xl hover:bg-gray-100 text-[#6B625D] text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default function RestaurantDetailPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-[#6B625D]">Loading restaurant experience...</div>}>
      <RestaurantDetailContent />
    </Suspense>
  );
}

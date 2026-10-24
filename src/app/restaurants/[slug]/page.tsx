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
  Star,
  RefreshCw
} from 'lucide-react';
import { db } from '@/lib/db';
import { 
  Restaurant, 
  MenuCategory, 
  MenuItem, 
  TimeSlotAvailability,
  RestaurantHours, 
  TableSeatStatus,
  AvailabilityStatus
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
  const [slotsStatus, setSlotsStatus] = useState<AvailabilityStatus>('loading');
  const [slotsMessage, setSlotsMessage] = useState<string>('');

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
  const fetchSlots = async (isBackground = false) => {
    if (!restaurant) return;
    if (!isBackground) setCheckingSlots(true);
    try {
      const details = await db.getSlotAvailabilityDetails(restaurant.id, visitDate, partySize);
      setAvailableSlots(details.slots || []);
      setSlotsStatus(details.status);
      setSlotsMessage(details.message);
      if (selectedSlot) {
        const stillAvail = (details.slots || []).find(s => s.time === selectedSlot && s.isAvailable);
        if (!stillAvail) setSelectedSlot(null);
      }
    } catch (err) {
      setSlotsStatus('error');
      setSlotsMessage("We couldn't load availability. Please try again.");
      setAvailableSlots([]);
    } finally {
      if (!isBackground) setCheckingSlots(false);
    }
  };

  useEffect(() => {
    if (!restaurant) return;
    let isSubscribed = true;

    const runFetch = async (isBackground = false) => {
      if (!isBackground) setCheckingSlots(true);
      try {
        const details = await db.getSlotAvailabilityDetails(restaurant.id, visitDate, partySize);
        if (isSubscribed) {
          setAvailableSlots(details.slots || []);
          setSlotsStatus(details.status);
          setSlotsMessage(details.message);
          if (selectedSlot) {
            const stillAvail = (details.slots || []).find(s => s.time === selectedSlot && s.isAvailable);
            if (!stillAvail) setSelectedSlot(null);
          }
        }
      } catch (err) {
        if (isSubscribed) {
          setSlotsStatus('error');
          setSlotsMessage("We couldn't load availability. Please try again.");
          setAvailableSlots([]);
        }
      } finally {
        if (isSubscribed && !isBackground) {
          setCheckingSlots(false);
        }
      }
    };

    // Initial load
    runFetch(false);

    // Live polling every 5s so when other users reserve seats, seat counts drop in real-time
    const interval = setInterval(() => {
      runFetch(true);
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
      fetchSlots(true);
      const seatData = await db.getTableSeatsAvailability(restaurant.id, visitDate, selectedSlot, partySize);
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
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-[#8D8178]">
        Loading restaurant experience...
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-[#F5F0E9] font-serif">Restaurant Not Found</h2>
        <p className="text-sm text-[#B7AAA0] mt-2">The requested dining venue does not exist or has been unpublished.</p>
        <Link href="/restaurants" className="mt-4 inline-block text-sm text-[#C6A47E] font-semibold underline">
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
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B7AAA0] hover:text-[#F5F0E9] transition"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Restaurants
      </Link>

      {/* CONFIRMED STATE */}
      {step === 'confirmed' && (
        <div className="bg-[#181513] rounded-3xl border border-[#332A25] p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-2xl shadow-black/80 space-y-6">
          <div className="w-16 h-16 rounded-full bg-[#142816] border border-[#234A28] text-[#81C784] flex items-center justify-center mx-auto shadow-md">
            <Check className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-[#81C784]">
              Booking Confirmed
            </span>
            <h2 className="font-serif text-3xl font-bold text-[#F5F0E9] mt-1">
              We look forward to welcoming you!
            </h2>
            <p className="text-sm text-[#B7AAA0] mt-2">
              Your reservation and kitchen pre-order at <strong className="text-[#F5F0E9]">{restaurant.name}</strong> has been secured.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#151311] border border-[#332A25] text-left space-y-2 text-sm">
            <div className="flex justify-between border-b border-[#241E1A] pb-2">
              <span className="text-[#B7AAA0]">Booking Reference:</span>
              <strong className="font-mono text-base text-[#C6A47E]">{confirmedBookingReference}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#B7AAA0]">Date & Time:</span>
              <strong className="text-[#F5F0E9]">{visitDate} at {selectedSlot}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#B7AAA0]">Party Size:</span>
              <strong className="text-[#F5F0E9]">{partySize} {partySize === 1 ? 'Guest' : 'Guests'}</strong>
            </div>
            {selectedTableId && (
              <div className="flex justify-between items-center bg-[#1C1917] px-2.5 py-1.5 rounded-lg border border-[#38251F]">
                <span className="text-[#C6A47E] font-medium">Selected Table & Seats:</span>
                <span className="font-bold text-[#F5F0E9]">
                  {tableSeats.find(t => t.tableId === selectedTableId)?.tableNumber || 'Assigned Table'}
                  {selectedSeats.length > 0 && ` • Seats: ${selectedSeats.map(s => `#${s}`).join(', ')}`}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#B7AAA0]">Pre-Ordered Items:</span>
              <strong className="text-[#F5F0E9]">{cartItemsList.length} dishes</strong>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#241E1A]">
              <span className="text-[#B7AAA0]">Estimated Pre-Order Total:</span>
              <strong className="text-base text-[#F5F0E9]">${estimatedTotal.toFixed(2)}</strong>
            </div>
          </div>

          <p className="text-xs text-[#8D8178] leading-relaxed">
            Payment for pre-orders and any added items is settled at the venue upon dining. 
            Cancellations are accepted without fee up to {restaurant.cancellationCutoffHours} hours in advance.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/my-bookings"
              className="px-6 py-2.5 rounded-xl bg-[#8B5E45] hover:bg-[#9E6C51] text-[#F5F0E9] text-sm font-semibold transition shadow-xs border border-[#8B5E45]/80"
            >
              View in My Bookings
            </Link>
            <Link
              href="/restaurants"
              className="px-6 py-2.5 rounded-xl bg-[#151311] hover:bg-[#1C1917] text-[#B7AAA0] hover:text-[#F5F0E9] text-sm font-medium border border-[#332A25] transition"
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
          <div className="bg-[#181513] rounded-3xl border border-[#332A25] overflow-hidden shadow-xl shadow-black/60">
            <div className="relative h-64 sm:h-80 w-full bg-[#151311]">
              <img
                src={restaurant.coverImageUrl}
                alt={restaurant.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0B]/90 via-[#0B0B0B]/40 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-[#F5F0E9]">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {restaurant.cuisineType.map(c => (
                    <span key={c} className="px-2.5 py-0.5 rounded-md bg-[#0B0B0B]/85 backdrop-blur-md text-xs font-medium border border-[#332A25]">
                      {c}
                    </span>
                  ))}
                  <span className="px-2.5 py-0.5 rounded-md bg-[#38251F]/90 text-xs font-semibold text-[#C6A47E] border border-[#54372D]">
                    {restaurant.priceTier}
                  </span>
                  <div className="px-3 py-0.5 rounded-md bg-[#151311]/95 backdrop-blur-md text-[#F5F0E9] text-xs font-semibold flex items-center gap-1.5 border border-[#332A25] shadow-xs">
                    {restaurant.reviewCount && restaurant.reviewCount > 0 ? (
                      <>
                        <Star className="w-3.5 h-3.5 text-[#C6A47E] fill-[#C6A47E]" />
                        <span>{restaurant.rating?.toFixed(1)}/5</span>
                        <span className="text-[#8D8178] font-normal">
                          ({restaurant.reviewCount} verified {restaurant.reviewCount === 1 ? 'review' : 'reviews'})
                        </span>
                      </>
                    ) : (
                      <>
                        <Star className="w-3.5 h-3.5 text-[#54372D]" />
                        <span className="text-[#8D8178]">No reviews yet</span>
                      </>
                    )}
                  </div>
                </div>
                <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#F5F0E9]">
                  {restaurant.name}
                </h1>
                <p className="text-sm text-[#C6A47E] mt-1">
                  {restaurant.tagline}
                </p>
              </div>
            </div>

            {/* Quick Details Bar */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-b border-[#332A25] bg-[#151311] text-xs text-[#B7AAA0]">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#C6A47E] shrink-0" />
                <span>{restaurant.address}, {restaurant.city}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#C6A47E] shrink-0" />
                <span>{restaurant.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#C6A47E] shrink-0" />
                <span>Capacity: {restaurant.totalSeatingCapacity} seats</span>
              </div>
              
              {/* Live Opening Hours & Weekly Schedule Dropdown */}
              <div className="relative">
                <div 
                  onClick={() => setShowWeeklyHours(prev => !prev)}
                  className="flex items-center justify-between gap-1.5 cursor-pointer hover:text-[#F5F0E9] transition p-1.5 -m-1.5 rounded-lg hover:bg-[#1C1917] border border-transparent hover:border-[#332A25]"
                  title="Click to view weekly schedule"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#C6A47E] shrink-0" />
                    <div>
                      {todaySchedule ? (
                        todaySchedule.isClosed ? (
                          <span className="font-semibold text-rose-400">Closed Today</span>
                        ) : (
                          <span>
                            <strong className="text-[#81C784] font-semibold">Open: </strong>
                            {todaySchedule.openTime} – {todaySchedule.closeTime}
                          </span>
                        )
                      ) : (
                        <span>Hours loading...</span>
                      )}
                    </div>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#C6A47E] transition-transform ${showWeeklyHours ? 'rotate-180' : ''}`} />
                </div>

                {/* Weekly Hours Popover */}
                {showWeeklyHours && (
                  <div className="absolute right-0 top-full mt-2 w-64 p-3.5 bg-[#1C1917] rounded-2xl border border-[#332A25] shadow-2xl z-30 text-xs space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between border-b border-[#332A25] pb-1.5 font-bold text-[#F5F0E9]">
                      <span>Weekly Operating Hours</span>
                      <span className="text-[10px] text-[#C6A47E] font-normal">7-Day Schedule</span>
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
                              isToday ? 'bg-[#38251F] font-bold text-[#F5F0E9]' : 'text-[#B7AAA0]'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              {dayNames[dayIndex]}
                              {isToday && <span className="w-1.5 h-1.5 rounded-full bg-[#81C784]"></span>}
                            </span>
                            <span>
                              {!dayH || dayH.isClosed ? (
                                <span className="text-rose-400 font-medium">Closed</span>
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
              <h3 className="font-serif text-base font-bold text-[#F5F0E9]">About the Venue</h3>
              <p className="text-sm text-[#B7AAA0] mt-2 leading-relaxed">
                {restaurant.description}
              </p>
              <div className="mt-4 p-3 rounded-xl bg-[#151311] border border-[#332A25] text-xs text-[#B7AAA0] flex items-start gap-2">
                <Info className="w-4 h-4 text-[#C6A47E] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[#F5F0E9]">Cancellation Policy: </span>
                  {restaurant.cancellationPolicy}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: CINEMA BOOKING INTERFACE (Desktop: 2-column, Mobile: Booking details -> Seating Map -> Contact/Pre-Order -> Submit) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: Booking Parameters & Checkout */}
            <div className="lg:col-span-5 space-y-6 order-1">
              <div className="bg-[#181513] rounded-3xl border border-[#332A25] p-6 shadow-2xl space-y-6">
                
                <div className="border-b border-[#332A25] pb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#C6A47E]">
                    Reservation Details • Cinema-Style Selection
                  </span>
                  <h3 className="font-serif text-xl font-bold text-[#F5F0E9] mt-0.5">
                    Reserve Your Table & Seats
                  </h3>
                </div>

                {/* Step 1: Date & Guests Selection */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#B7AAA0] mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={visitDate}
                        min={todayStr}
                        onChange={(e) => setVisitDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#332A25] text-xs font-medium text-[#F5F0E9] bg-[#151311] focus:outline-hidden focus:border-[#8B5E45]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#B7AAA0] mb-1">
                        Party Size
                      </label>
                      <select
                        value={partySize}
                        onChange={(e) => setPartySize(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-[#332A25] text-xs font-medium text-[#F5F0E9] bg-[#151311] focus:outline-hidden focus:border-[#8B5E45]"
                      >
                        {[1, 2, 3, 4, 5, 6, 8, 10, 12, 14].map(num => (
                          <option key={num} value={num} className="bg-[#181513] text-[#F5F0E9]">
                            {num} {num === 1 ? 'Guest' : 'Guests'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Slots with Genuine Availability Indicators */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#B7AAA0]">
                        Available Time Slots
                      </label>
                      <span className="text-[10px] text-[#C6A47E]">
                        Slot Duration: {restaurant.slotDurationMinutes} mins
                      </span>
                    </div>

                    {checkingSlots ? (
                      <div className="text-xs text-[#B7AAA0] py-5 text-center animate-pulse flex items-center justify-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-[#8B5E45] border-t-transparent rounded-full animate-spin"></span>
                        <span>Checking available times...</span>
                      </div>
                    ) : slotsStatus === 'closed' ? (
                      <div className="p-3.5 rounded-xl bg-[#241311] text-[#FCA5A5] text-xs border border-[#4A201D] space-y-1">
                        <div className="font-semibold flex items-center gap-1.5 text-rose-300">
                          <Clock className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>This restaurant is closed on the selected date.</span>
                        </div>
                        <p className="text-[11px] text-rose-200/80 leading-relaxed">
                          {slotsMessage || `${restaurant.name} has no scheduled operating hours on ${visitDate}. Please select another date.`}
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowWeeklyHours(true)}
                          className="text-[11px] font-semibold text-[#C6A47E] underline underline-offset-2 hover:text-[#F5F0E9] mt-1 cursor-pointer block"
                        >
                          View 7-Day Operating Hours
                        </button>
                      </div>
                    ) : slotsStatus === 'missing_schedule' ? (
                      <div className="p-3.5 rounded-xl bg-[#291F11] text-[#FDE68A] text-xs border border-[#5E4018] space-y-1">
                        <div className="font-semibold flex items-center gap-1.5 text-amber-300">
                          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Opening hours have not been configured for this restaurant.</span>
                        </div>
                        <p className="text-[11px] text-amber-200/80 leading-relaxed">
                          The management has not published hours for this date. Please check back soon or contact the venue directly.
                        </p>
                      </div>
                    ) : slotsStatus === 'no_slots' ? (
                      <div className="p-3.5 rounded-xl bg-[#291F11] text-[#FDE68A] text-xs border border-[#5E4018] space-y-1">
                        <div className="font-semibold flex items-center gap-1.5 text-amber-300">
                          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>No reservation times are available for this date. Please try another date.</span>
                        </div>
                        <p className="text-[11px] text-amber-200/80 leading-relaxed">
                          All available capacity for a party of {partySize} on {visitDate} has been filled or previous slots have passed.
                        </p>
                      </div>
                    ) : slotsStatus === 'error' ? (
                      <div className="p-3.5 rounded-xl bg-[#241311] text-[#FCA5A5] text-xs border border-[#4A201D] space-y-2">
                        <div className="font-semibold flex items-center gap-1.5 text-rose-300">
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>We couldn't load availability. Please try again.</span>
                        </div>
                        <p className="text-[11px] text-rose-200/80">
                          {slotsMessage || 'Unable to connect to live booking service.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => fetchSlots(false)}
                          className="px-3 py-1.5 rounded-lg bg-[#38251F] hover:bg-[#54372D] text-[#F5F0E9] font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs border border-[#332A25]"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Retry Availability</span>
                        </button>
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="p-3.5 rounded-xl bg-[#291F11] text-[#FDE68A] text-xs border border-[#5E4018] space-y-1">
                        <div className="font-semibold flex items-center gap-1.5 text-amber-300">
                          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>No reservation times are available for this date. Please try another date.</span>
                        </div>
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
                                ? 'bg-[#8B5E45] text-[#F5F0E9] border-[#8B5E45] shadow-md ring-1 ring-[#C6A47E]/40'
                                : slot.isAvailable
                                ? 'bg-[#151311] hover:bg-[#38251F]/40 text-[#F5F0E9] border-[#332A25]'
                                : 'bg-[#111111] text-[#8D8178]/40 border-[#221B17] cursor-not-allowed line-through'
                            }`}
                            title={slot.reason || `${slot.remainingSeats} seats available`}
                          >
                            <span>{slot.formattedTime}</span>
                            <span className={`text-[9px] mt-0.5 ${selectedSlot === slot.time ? 'text-[#F5F0E9]/90 font-semibold' : 'text-[#C6A47E]'}`}>
                              {slot.isAvailable ? `${slot.remainingSeats} seats` : 'Full'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected Seats & Table Status (Cinema-style badge) */}
                  <div className="p-3.5 rounded-2xl bg-[#151311] border border-[#332A25] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#C6A47E] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#C6A47E]" />
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
                          className="text-[11px] text-[#C6A47E] hover:text-[#F5F0E9] underline cursor-pointer"
                        >
                          Change
                        </button>
                      )}
                    </div>

                    {selectedTableId ? (
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between font-semibold text-[#F5F0E9]">
                          <span>Table:</span>
                          <span className="text-[#C6A47E]">{tableSeats.find(t => t.tableId === selectedTableId)?.tableNumber || 'Selected Table'} ({tableSeats.find(t => t.tableId === selectedTableId)?.locationArea})</span>
                        </div>
                        <div className="flex items-center justify-between text-[#B7AAA0]">
                          <span>Cinema Seats:</span>
                          <div className="flex gap-1 flex-wrap justify-end">
                            {selectedSeats.length > 0 ? (
                              selectedSeats.map(s => (
                                <span key={s} className="px-2 py-0.5 rounded-md bg-[#8B5E45] text-[#F5F0E9] text-[10px] font-bold border border-[#C6A47E]/40">
                                  Seat #{s}
                                </span>
                              ))
                            ) : (
                              <span className="text-[#C6A47E] font-medium">Whole Table</span>
                            )}
                          </div>
                        </div>
                        {seatHoldToken && (
                          <div className="pt-1 text-[10px] text-[#C6A47E] flex items-center gap-1 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C6A47E] animate-ping"></span>
                            Held exclusively for you while booking is completed
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-[#8D8178] italic">
                        Choose your preferred seats or table from the interactive map.
                      </p>
                    )}
                  </div>
                </div>

                {/* MOBILE ONLY: Seating map appears immediately after booking details on small screens */}
                <div className="block lg:hidden pt-2 border-t border-[#332A25]">
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
                <div className="border-t border-[#332A25] pt-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#F5F0E9]">
                    <span>Pre-Order Summary ({cartItemsList.length} items)</span>
                    <span className="text-[#C6A47E]">${subtotal.toFixed(2)}</span>
                  </div>

                  {cartItemsList.length > 0 ? (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {cartItemsList.map(({ item, quantity, lineTotal }) => (
                        <div key={item!.id} className="flex justify-between text-xs text-[#B7AAA0]">
                          <span>{quantity}x {item!.name}</span>
                          <span className="text-[#F5F0E9]">${lineTotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#8D8178] italic">
                      No food pre-ordered yet. You can order upon arrival or add items from the menu.
                    </p>
                  )}

                  <div className="border-t border-[#332A25]/70 pt-2 space-y-1 text-xs">
                    <div className="flex justify-between text-[#8D8178]">
                      <span>Estimated Tax (8.875%):</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-[#F5F0E9] pt-1">
                      <span>Estimated Total:</span>
                      <span className="text-[#C6A47E]">${estimatedTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Customer Contact Details */}
                <div className="border-t border-[#332A25] pt-4 space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#C6A47E]">
                    Customer Contact
                  </span>

                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="block text-[#B7AAA0] mb-0.5">Full Name</label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] focus:outline-hidden focus:border-[#8B5E45]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[#B7AAA0] mb-0.5">Email</label>
                        <input
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] focus:outline-hidden focus:border-[#8B5E45]"
                        />
                      </div>
                      <div>
                        <label className="block text-[#B7AAA0] mb-0.5">Phone</label>
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] focus:outline-hidden focus:border-[#8B5E45]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[#B7AAA0] mb-0.5">Special Dietary / Seating Request</label>
                      <textarea
                        rows={2}
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        placeholder="e.g. Anniversary celebration, peanut allergy, window seat preference"
                        className="w-full px-3 py-1.5 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] placeholder-[#8D8178] text-xs focus:outline-hidden focus:border-[#8B5E45]"
                      />
                    </div>
                  </div>
                </div>

                {/* Error Banner */}
                {bookingError && (
                  <div className="p-3 rounded-xl bg-[#241311] border border-[#4A201D] text-xs text-rose-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{bookingError}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="button"
                  disabled={!selectedSlot || isSubmitting}
                  onClick={handleInitiateBooking}
                  className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                    selectedSlot && !isSubmitting
                      ? 'bg-[#8B5E45] hover:bg-[#9E6C51] text-[#F5F0E9] shadow-[#8B5E45]/20 hover:shadow-[#8B5E45]/30'
                      : 'bg-[#151311] text-[#8D8178] border border-[#332A25] cursor-not-allowed opacity-60'
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

                <p className="text-[11px] text-[#8D8178] text-center leading-relaxed">
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
        <div className="bg-[#181513] rounded-3xl border border-[#332A25] p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#F5F0E9]">
                Chef’s Menu & Advance Pre-Order
              </h2>
              <p className="text-xs text-[#B7AAA0] mt-1">
                Select courses in advance to guarantee kitchen prep upon your arrival, or skip and order at the table.
              </p>
            </div>

            {cartItemsList.length > 0 && (
              <div className="flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-[#151311] border border-[#8B5E45]/40 text-[#F5F0E9]">
                <ShoppingBag className="w-4 h-4 text-[#C6A47E]" />
                {cartItemsList.length} items in pre-order (${subtotal.toFixed(2)})
              </div>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#332A25]">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-[#8B5E45] text-[#F5F0E9] font-semibold shadow-xs'
                  : 'bg-[#151311] text-[#B7AAA0] hover:text-[#F5F0E9] border border-[#332A25]'
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
                    ? 'bg-[#8B5E45] text-[#F5F0E9] font-semibold shadow-xs'
                    : 'bg-[#151311] text-[#B7AAA0] hover:text-[#F5F0E9] border border-[#332A25]'
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
                    className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center ${
                      qty > 0 
                        ? 'bg-[#1C1917] border-[#8B5E45]/60 shadow-md ring-1 ring-[#8B5E45]/20' 
                        : 'bg-[#1C1917] border-[#332A25] hover:border-[#54372D]'
                    } ${!item.isAvailable ? 'opacity-50 bg-[#111111]' : ''}`}
                  >
                    {/* Image & Text */}
                    <div className="flex gap-4 items-start flex-1">
                      {item.imageUrl && (
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#111111] shrink-0 border border-[#332A25]">
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-serif font-bold text-base text-[#F5F0E9]">
                            {item.name}
                          </h4>
                          {item.isVegetarian && (
                            <span className="px-2 py-0.5 rounded-md bg-[#132A1C] text-[#86EFAC] text-[10px] font-semibold flex items-center gap-1 border border-[#165B33]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                              Vegetarian
                            </span>
                          )}
                          {item.isNonVegetarian && (
                            <span className="px-2 py-0.5 rounded-md bg-[#2E1212] text-[#FCA5A5] text-[10px] font-semibold flex items-center gap-1 border border-[#5E1E1E]">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block"></span>
                              Non-Veg
                            </span>
                          )}
                          {item.isGlutenFree && (
                            <span className="px-2 py-0.5 rounded-md bg-[#291F11] text-[#FDE68A] text-[10px] font-semibold border border-[#5E4018]">
                              Gluten-Free
                            </span>
                          )}
                          {!item.isAvailable && (
                            <span className="px-2 py-0.5 rounded-md bg-[#2E1212] text-[#FCA5A5] text-[10px] font-bold border border-[#5E1E1E]">
                              Sold Out
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#B7AAA0] mt-1 leading-relaxed">
                          {item.description}
                        </p>
                        {item.preparationNotes && (
                          <p className="text-[11px] text-[#C6A47E] mt-1 italic">
                            Note: {item.preparationNotes}
                          </p>
                        )}
                        <div className="mt-2 font-semibold text-sm text-[#F5F0E9]">
                          ${item.price.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="shrink-0 self-end sm:self-center">
                      {!item.isAvailable ? (
                        <span className="text-xs text-rose-400 font-medium">Currently Unavailable</span>
                      ) : qty === 0 ? (
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="px-3.5 py-1.5 rounded-xl border border-[#8B5E45] text-[#C6A47E] hover:bg-[#8B5E45] hover:text-[#F5F0E9] text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 bg-[#151311] border border-[#332A25] rounded-xl p-1 shadow-xs">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-7 h-7 rounded-lg hover:bg-[#38251F] text-[#F5F0E9] flex items-center justify-center transition cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center font-bold text-sm text-[#F5F0E9]">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-7 h-7 rounded-lg hover:bg-[#38251F] text-[#F5F0E9] flex items-center justify-center transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#181513] rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-[#332A25] shadow-2xl relative space-y-6">
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#38251F] text-[#C6A47E] flex items-center justify-center shrink-0 border border-[#54372D]">
                <AlertCircle className="w-6 h-6 text-[#C6A47E]" />
              </div>
              <div className="flex-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C6A47E] bg-[#38251F] px-2 py-0.5 rounded-md inline-block border border-[#54372D]">
                  Active Booking Found
                </span>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#F5F0E9] mt-1.5">
                  You already have a booking here!
                </h3>
                <p className="text-xs sm:text-sm text-[#B7AAA0] mt-1">
                  There is currently an active reservation under your profile for <strong className="text-[#F5F0E9]">{restaurant.name}</strong>.
                </p>
              </div>
            </div>

            {/* Existing Booking Summary Card */}
            <div className="p-4 rounded-2xl bg-[#151311] border border-[#332A25] text-xs space-y-2">
              <div className="flex justify-between items-center border-b border-[#332A25] pb-2">
                <span className="text-[#8D8178]">Reference:</span>
                <span className="font-mono font-bold text-[#C6A47E]">{activeBooking.bookingReference}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8D8178]">Existing Date & Time:</span>
                <strong className="text-[#F5F0E9]">{activeBooking.reservationDate} at {activeBooking.startTime}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8D8178]">Guests:</span>
                <span className="text-[#F5F0E9] font-medium">{activeBooking.partySize} guests</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8D8178]">Status:</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-[#132A1C] text-[#86EFAC] border border-[#165B33]">
                  {activeBooking.status}
                </span>
              </div>
            </div>

            <div className="text-xs text-[#B7AAA0] leading-relaxed bg-[#1C1917] p-3 rounded-xl border border-[#332A25]">
              <strong className="text-[#F5F0E9]">Do you want to create a new additional booking?</strong>
              <p className="mt-0.5 text-[#8D8178]">
                Creating an additional reservation will allocate separate table capacity for <span className="text-[#C6A47E] font-semibold">{visitDate} at {selectedSlot}</span>.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={executeBooking}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-xl bg-[#8B5E45] hover:bg-[#9E6C51] text-[#F5F0E9] text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
              >
                {isSubmitting ? 'Creating New Booking...' : 'Yes, Create New Booking'}
              </button>
              <Link
                href="/my-bookings"
                className="py-3 px-4 rounded-xl bg-[#151311] hover:bg-[#38251F] text-[#F5F0E9] text-xs font-semibold border border-[#332A25] text-center transition"
              >
                View Existing in My Bookings
              </Link>
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="py-3 px-4 rounded-xl hover:bg-[#151311] text-[#8D8178] hover:text-[#F5F0E9] text-xs font-medium transition cursor-pointer"
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

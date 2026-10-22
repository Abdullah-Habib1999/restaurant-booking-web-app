'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Building2, 
  Store, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Lock, 
  Users, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react';

export default function PartnerRegisterPage() {
  const router = useRouter();
  const { registerOwner } = useAuth();

  // Form Fields
  const [restaurantName, setRestaurantName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [cuisineType, setCuisineType] = useState('Italian, Mediterranean');
  const [description, setDescription] = useState('');
  const [seatingCapacity, setSeatingCapacity] = useState(48);
  const [numTables, setNumTables] = useState(10);
  const [openTime, setOpenTime] = useState('12:00');
  const [closeTime, setCloseTime] = useState('23:00');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredRestaurantId, setRegisteredRestaurantId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form Validations
    if (!agreeTerms) {
      setErrorMessage('Please accept the TableReserve Merchant Partner Terms to continue.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your password.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (Number(seatingCapacity) <= 0 || Number(numTables) <= 0) {
      setErrorMessage('Seating capacity and number of tables must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    const result = await registerOwner({
      fullName,
      email,
      phone,
      password,
      restaurantName,
      address,
      city,
      cuisineType,
      description,
      seatingCapacity: Number(seatingCapacity),
      numTables: Number(numTables),
      openTime,
      closeTime
    });

    setIsSubmitting(false);

    if (result.success && result.restaurantId) {
      setRegisteredRestaurantId(result.restaurantId);
    } else {
      setErrorMessage(result.error || 'Failed to complete registration. Please check your inputs.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F5F0] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E9DFD2] text-[#3B2924] text-xs font-semibold tracking-wider uppercase mb-2">
            <Store className="w-3.5 h-3.5 text-[#795548]" />
            Restaurant Partnership
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#201B18]">
            Register Your Restaurant
          </h1>
          <p className="text-sm text-[#776B63] max-w-xl mx-auto">
            Join the TableReserve platform to welcome diners with pre-ordered courses, verified seating capacity, and zero table-idle time.
          </p>
        </div>

        {/* Success / Pending Approval Screen */}
        {registeredRestaurantId ? (
          <div className="bg-white rounded-3xl border border-[#E6DDD3] p-8 sm:p-12 shadow-sm text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
              <Clock className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs uppercase font-bold tracking-widest text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
                Status: Pending Platform Review
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#201B18] mt-3">
                Welcome to TableReserve, {restaurantName}!
              </h2>
              <p className="text-sm text-[#776B63] mt-2 max-w-lg mx-auto leading-relaxed">
                Your merchant account and restaurant profile have been created. In accordance with platform quality standards, your listing is currently <strong className="text-[#201B18]">Pending Approval</strong> before going live to public diners.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8F5F0] border border-[#E6DDD3] text-left text-xs space-y-2.5 max-w-md mx-auto">
              <div className="flex justify-between border-b border-[#E6DDD3]/60 pb-2">
                <span className="text-[#776B63]">Restaurant:</span>
                <strong className="text-[#201B18]">{restaurantName}</strong>
              </div>
              <div className="flex justify-between border-b border-[#E6DDD3]/60 pb-2">
                <span className="text-[#776B63]">Owner Account:</span>
                <strong className="text-[#201B18]">{email}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#776B63]">Seating Capacity:</span>
                <strong className="text-[#201B18]">{seatingCapacity} seats across {numTables} tables</strong>
              </div>
            </div>

            <p className="text-xs text-[#776B63] max-w-md mx-auto">
              You may now enter your private restaurant console to configure your menus, adjust table floor plans, and review incoming reservation settings.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => router.push('/owner/overview')}
                className="px-6 py-3 rounded-xl bg-[#3B2924] hover:bg-[#795548] text-white text-xs font-semibold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Enter Owner Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM */
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-[#E6DDD3] p-6 sm:p-10 shadow-sm space-y-8">
            
            {/* Error Banner */}
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Section 1: Venue & Concept */}
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-[#201B18] border-b border-[#E6DDD3] pb-2">
                1. Restaurant Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#776B63] mb-1">
                    Restaurant Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Trattoria del Lago"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6DDD3] bg-[#F8F5F0] text-[#201B18] font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#795548]/30"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#776B63] mb-1">
                    Cuisine Specialty *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Northern Italian, Wood-Fired"
                    value={cuisineType}
                    onChange={(e) => setCuisineType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6DDD3] bg-[#F8F5F0] text-[#201B18] text-sm focus:outline-none focus:ring-2 focus:ring-[#795548]/30"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-semibold uppercase tracking-wider text-[#776B63] mb-1">
                  Restaurant Overview & Concept *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe your culinary philosophy, signature dishes, and dining ambiance..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6DDD3] bg-[#F8F5F0] text-[#201B18] text-sm focus:outline-none focus:ring-2 focus:ring-[#795548]/30"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#776B63] mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 520 Regent Way"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6DDD3] bg-[#F8F5F0] text-[#201B18] text-sm focus:outline-none focus:ring-2 focus:ring-[#795548]/30"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#776B63] mb-1">
                    City & State *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. New York, NY"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6DDD3] bg-[#F8F5F0] text-[#201B18] text-sm focus:outline-none focus:ring-2 focus:ring-[#795548]/30"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Seating Capacity & Service Hours */}
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-[#201B18] border-b border-[#E6DDD3] pb-2">
                2. Seating & Operating Schedule
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#776B63] mb-1">
                    Total Seating Capacity *
                  </label>
                  <input
                    type="number"
                    min={4}
                    max={500}
                    required
                    value={seatingCapacity}
                    onChange={(e) => setSeatingCapacity(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6DDD3] bg-[#F8F5F0] text-[#201B18] font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#795548]/30"
                  />
                  <p className="text-[10px] text-[#776B63] mt-1">Maximum guests dining simultaneously.</p>
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#776B63] mb-1">
                    Number of Tables *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={numTables}
                    onChange={(e) => setNumTables(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6DDD3] bg-[#F8F5F0] text-[#201B18] font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#795548]/30"
                  />
                  <p className="text-[10px] text-[#776B63] mt-1">We will generate initial table IDs automatically.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#776B63] mb-1">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6DDD3] bg-[#F8F5F0] text-[#201B18] text-sm focus:outline-none focus:ring-2 focus:ring-[#795548]/30"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#776B63] mb-1">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6DDD3] bg-[#F8F5F0] text-[#201B18] text-sm focus:outline-none focus:ring-2 focus:ring-[#795548]/30"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Owner Account & Security */}
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-[#201B18] border-b border-[#E6DDD3] pb-2">
                3. Restaurant Owner Credentials
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#776B63] mb-1">
                    Owner Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alessandro Rossi"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6DDD3] bg-[#F8F5F0] text-[#201B18] text-sm focus:outline-none focus:ring-2 focus:ring-[#795548]/30"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#776B63] mb-1">
                    Direct Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6DDD3] bg-[#F8F5F0] text-[#201B18] text-sm focus:outline-none focus:ring-2 focus:ring-[#795548]/30"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-semibold uppercase tracking-wider text-[#776B63] mb-1">
                  Business Email (Used for Owner Login) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="owner@yourrestaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6DDD3] bg-[#F8F5F0] text-[#201B18] text-sm focus:outline-none focus:ring-2 focus:ring-[#795548]/30"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#776B63] mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6DDD3] bg-[#F8F5F0] text-[#201B18] text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-[#795548]/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#776B63] hover:text-[#201B18]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#776B63] mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6DDD3] bg-[#F8F5F0] text-[#201B18] text-sm focus:outline-none focus:ring-2 focus:ring-[#795548]/30"
                  />
                </div>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer text-xs text-[#776B63]">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 accent-[#3B2924] w-4 h-4"
                />
                <span>
                  I represent that I am the authorized operator or owner of this culinary venue, and I accept the <Link href="/terms" className="text-[#3B2924] underline">Merchant Partner Terms</Link> and <Link href="/privacy" className="text-[#3B2924] underline">Privacy Policy</Link>.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-[#E6DDD3] flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-[#776B63]">
                Already registered? <Link href="/partner/login" className="text-[#3B2924] font-bold underline">Sign in to console</Link>
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#3B2924] hover:bg-[#795548] text-white font-semibold text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Registering Venue...</span>
                ) : (
                  <>
                    <span>Submit Restaurant Registration</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}

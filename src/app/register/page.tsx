'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/db';
import { 
  User, 
  Mail, 
  Lock, 
  Phone, 
  ArrowRight, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ArrowLeft 
} from 'lucide-react';

export default function CustomerRegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    const existing = await db.getUserByEmail(email);
    if (existing) {
      setIsSubmitting(false);
      setErrorMessage('An account with this email already exists. Please sign in instead.');
      return;
    }

    const newUser = {
      id: `cust-${Date.now()}`,
      email,
      fullName,
      phone,
      role: 'customer' as const,
      password,
      createdAt: new Date().toISOString()
    };

    await db.saveUser(newUser);
    await login(email, password);
    setIsSubmitting(false);
    router.push('/restaurants');
  };

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#F8F5F0] py-16 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-md w-full mx-auto space-y-6">
        
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#776B63] hover:text-[#201B18] transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Restaurants
        </Link>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-[#E6DDD3] p-8 sm:p-10 shadow-sm space-y-6">
          
          <div className="text-center space-y-2">
            <h1 className="font-serif text-2xl font-bold text-[#201B18]">
              Create Your Account
            </h1>
            <p className="text-xs text-[#776B63]">
              Join TableReserve for verified restaurant seating and seamless food pre-ordering.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4 text-xs">
            
            <div>
              <label className="block font-semibold uppercase tracking-wider text-[#776B63] mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#795548] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Eleanor Vance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#E6DDD3] bg-[#F8F5F0] text-[#201B18] text-sm focus:outline-none focus:ring-2 focus:ring-[#795548]/30"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-[#776B63] mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#795548] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="eleanor@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#E6DDD3] bg-[#F8F5F0] text-[#201B18] text-sm focus:outline-none focus:ring-2 focus:ring-[#795548]/30"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-[#776B63] mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#795548] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#E6DDD3] bg-[#F8F5F0] text-[#201B18] text-sm focus:outline-none focus:ring-2 focus:ring-[#795548]/30"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-[#776B63] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#795548] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E6DDD3] bg-[#F8F5F0] text-[#201B18] text-sm focus:outline-none focus:ring-2 focus:ring-[#795548]/30"
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
                Confirm Password
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-[#3B2924] hover:bg-[#795548] text-white font-semibold text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating Account...' : 'Complete Registration'}
              <ArrowRight className="w-4 h-4" />
            </button>

          </form>

          <div className="pt-4 border-t border-[#E6DDD3] text-center text-xs text-[#776B63]">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-[#3B2924] underline">
              Sign In
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}

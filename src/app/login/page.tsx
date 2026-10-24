'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  User, 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ArrowLeft 
} from 'lucide-react';

export default function CustomerLoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const res = await login(email, password);
    setIsSubmitting(false);

    if (res.success && res.user) {
      if (res.user.role === 'restaurant_owner') {
        router.push('/owner/overview');
      } else {
        router.push('/my-bookings');
      }
    } else {
      setErrorMessage(res.error || 'Invalid credentials. Please verify your email and password.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#0B0B0B] py-16 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-md w-full mx-auto space-y-6">
        
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#8D8178] hover:text-[#F5F0E9] transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Restaurants
        </Link>

        {/* Card */}
        <div className="bg-[#181513] rounded-3xl border border-[#332A25] p-8 sm:p-10 shadow-2xl space-y-6">
          
          <div className="text-center space-y-2">
            <h1 className="font-serif text-2xl font-bold text-[#F5F0E9]">
              Welcome Back
            </h1>
            <p className="text-xs text-[#B7AAA0]">
              Sign in to view your upcoming dining bookings and pre-orders.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-[#241311] border border-[#4A201D] text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            
            <div>
              <label className="block font-semibold uppercase tracking-wider text-[#B7AAA0] mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#C6A47E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="eleanor@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] placeholder-[#8D8178] text-sm focus:outline-hidden focus:border-[#8B5E45]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold uppercase tracking-wider text-[#B7AAA0]">
                  Password
                </label>
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-[#C6A47E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] placeholder-[#8D8178] text-sm focus:outline-hidden focus:border-[#8B5E45]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8D8178] hover:text-[#F5F0E9]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-[#C6A47E]" />}
                </button>
              </div>
            </div>

            {/* Quick Demo Hint */}
            <div className="p-3 rounded-xl bg-[#151311] border border-[#332A25] text-[11px] text-[#8D8178] space-y-1">
              <span className="font-semibold text-[#F5F0E9] block">Demo Customer Login:</span>
              <div className="flex justify-between">
                <span>Email:</span>
                <span className="font-mono text-[#C6A47E]">customer@demo.com</span>
              </div>
              <div className="flex justify-between">
                <span>Password:</span>
                <span className="font-mono text-[#C6A47E]">password123</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl bg-[#8B5E45] hover:bg-[#9E6C51] text-[#F5F0E9] font-semibold text-xs transition duration-200 shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>

          </form>

          <div className="pt-4 border-t border-[#332A25] text-center text-xs text-[#8D8178] space-y-2">
            <div>
              Don't have an account yet?{' '}
              <Link href="/register" className="font-bold text-[#C6A47E] hover:text-[#F5F0E9] underline">
                Create Account
              </Link>
            </div>
            <div className="pt-2">
              <Link href="/partner/login" className="text-[11px] text-[#C6A47E] hover:text-[#F5F0E9]">
                Restaurant Owner Portal Sign In →
              </Link>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  Key, 
  AlertCircle, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { adminApi, adminAuth } from '@/lib/adminApi';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await adminApi.checkStatus();
        setHasAdmin(res.hasAdmin);
        // If already logged in and verified, redirect to /admin
        const stored = adminAuth.getStoredAdmin();
        if (stored && stored.role === 'admin') {
          const verified = await adminApi.verifySession().catch(() => ({ authenticated: false }));
          if (verified.authenticated) {
            router.push('/admin');
            return;
          } else {
            adminAuth.clearStoredAdmin();
          }
        }
      } catch (e) {
        console.warn('Status check failed:', e);
      } finally {
        setChecking(false);
      }
    };
    check();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await adminApi.login(cleanEmail, password);
      adminAuth.setStoredAdmin(res.admin, res.token);
      // Ensure session is recognized before pushing
      await adminApi.verifySession().catch(() => null);
      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex flex-col items-center justify-center text-[#F5F0E9] space-y-3">
        <div className="w-8 h-8 border-2 border-[#C6A47E] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs uppercase tracking-widest text-[#C6A47E]">Checking Security Gateway...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex flex-col items-center justify-center p-4 sm:p-6 text-[#F5F0E9] antialiased">
      <div className="w-full max-w-md">
        
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-[#1C1917] border border-[#54372D] items-center justify-center text-[#C6A47E] shadow-xl mb-2">
            <ShieldCheck className="w-7 h-7 text-[#C6A47E]" />
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#F5F0E9]">
            Super Admin Portal
          </h1>
          <p className="text-xs text-[#8D8178] uppercase tracking-widest font-semibold">
            TableReserve Governance & Approvals
          </p>
        </div>

        {/* Notice if no admin initialized yet */}
        {hasAdmin === false && (
          <div className="mb-6 p-4 rounded-2xl bg-[#1C1917] border border-amber-500/40 text-xs text-amber-200 space-y-2 shadow-xl">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Sparkles className="w-4 h-4" />
              <span>Initial Setup Required</span>
            </div>
            <p className="text-amber-200/90 leading-relaxed text-[11px]">
              No Super Administrator exists on this TableReserve instance. Please initialize the first master account.
            </p>
            <Link
              href="/admin/setup"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold hover:bg-amber-500/30 transition text-[11px]"
            >
              <span>Initialize First Super Admin</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-[#181513] border border-[#332A25] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs space-y-2">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span className="leading-relaxed">{error}</span>
              </div>
              {(error.toLowerCase().includes('setup') || error.toLowerCase().includes('initial') || hasAdmin === false) && (
                <div className="pt-1">
                  <Link
                    href="/admin/setup"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C6A47E]/20 text-[#C6A47E] border border-[#C6A47E]/30 font-semibold hover:bg-[#C6A47E]/30 transition text-[11px]"
                  >
                    <span>Proceed to Master Setup (/admin/setup)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#C6A47E] block">
                Administrator Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8D8178] absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="admin@tablereserve.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0B0B] border border-[#332A25] text-xs text-[#F5F0E9] placeholder-[#554D47] focus:outline-none focus:border-[#C6A47E] transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#C6A47E] block">
                  Password
                </label>
              </div>
              <div className="relative">
                <Key className="w-4 h-4 text-[#8D8178] absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="Enter administrator password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0B0B] border border-[#332A25] text-xs text-[#F5F0E9] placeholder-[#554D47] focus:outline-none focus:border-[#C6A47E] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#8B5E45] hover:bg-[#9E6C51] text-[#F5F0E9] text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authenticate & Open Admin Dashboard</span>
                </>
              )}
            </button>

          </form>

          {hasAdmin === false && (
            <div className="text-center pt-2 border-t border-[#332A25]">
              <Link
                href="/admin/setup"
                className="text-xs text-[#C6A47E] hover:text-[#F5F0E9] transition font-semibold"
              >
                Need to create the first Super Admin? Click here &rarr;
              </Link>
            </div>
          )}

        </div>

        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-xs text-[#8D8178] hover:text-[#C6A47E] transition"
          >
            &larr; Return to TableReserve Public Dining
          </Link>
        </div>

      </div>
    </div>
  );
}

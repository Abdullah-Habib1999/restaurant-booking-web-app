'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Mail, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { adminApi, adminAuth } from '@/lib/adminApi';

export default function AdminSetupPage() {
  const router = useRouter();
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [isSecretRequired, setIsSecretRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [bootstrapSecret, setBootstrapSecret] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await adminApi.checkStatus();
        setHasAdmin(res.hasAdmin);
        setIsSecretRequired(res.isBootstrapSecretRequired);
      } catch (err: any) {
        setError('Failed to reach administration server. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    check();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!fullName.trim()) {
      setError('Please provide your full legal name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid administrative email.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters in length.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Password confirmation does not match.');
      return;
    }
    if (isSecretRequired && !bootstrapSecret.trim()) {
      setError('Server requires the ADMIN_BOOTSTRAP_SECRET environment key.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminApi.setupFirstAdmin({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        bootstrapSecret: bootstrapSecret.trim() || undefined
      });

      setSuccess('Super Admin initialized successfully! Signing in...');
      adminAuth.setStoredAdmin(res.admin);

      setTimeout(() => {
        router.push('/admin');
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Setup failed. Please check your credentials and secret.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex flex-col items-center justify-center text-[#F5F0E9] space-y-3">
        <div className="w-8 h-8 border-2 border-[#C6A47E] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs uppercase tracking-widest text-[#C6A47E]">Inspecting Security Vault...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex flex-col items-center justify-center p-4 sm:p-6 text-[#F5F0E9] antialiased">
      <div className="w-full max-w-lg">
        
        {/* Header Branding */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-[#1C1917] border border-[#54372D] items-center justify-center text-[#C6A47E] shadow-xl mb-2">
            <ShieldCheck className="w-7 h-7 text-[#C6A47E]" />
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#F5F0E9]">
            Super Admin Initialization
          </h1>
          <p className="text-xs text-[#8D8178] uppercase tracking-widest font-semibold">
            TableReserve Enterprise Platform Control
          </p>
        </div>

        {/* If Admin Already Exists and is locked */}
        {hasAdmin && !bootstrapSecret ? (
          <div className="bg-[#181513] border border-[#332A25] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-start gap-3.5 p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200">
              <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-bold text-amber-300 block">Setup Locked Down</span>
                <p className="text-amber-200/90 leading-relaxed">
                  A Super Administrator account already exists for this TableReserve deployment. For security, initial setup cannot be repeated without providing the server-side <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300">ADMIN_BOOTSTRAP_SECRET</code>.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Link
                href="/admin/login"
                className="w-full py-3 px-4 rounded-xl bg-[#8B5E45] hover:bg-[#9E6C51] text-[#F5F0E9] text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg cursor-pointer"
              >
                <span>Proceed to Admin Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <details className="text-xs text-[#8D8178] pt-2">
                <summary className="cursor-pointer hover:text-[#C6A47E] transition font-medium">
                  Have an emergency recovery bootstrap secret?
                </summary>
                <div className="pt-3">
                  <p className="text-[11px] text-[#B7AAA0] mb-3">
                    If you configured <code className="text-[#C6A47E]">ADMIN_BOOTSTRAP_SECRET</code> in your Netlify or production environment variables, enter it below to provision an additional Super Admin.
                  </p>
                  <input
                    type="password"
                    placeholder="Enter ADMIN_BOOTSTRAP_SECRET"
                    value={bootstrapSecret}
                    onChange={(e) => setBootstrapSecret(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0B0B] border border-[#332A25] text-xs text-[#F5F0E9] focus:outline-none focus:border-[#C6A47E]"
                  />
                </div>
              </details>
            </div>
          </div>
        ) : (
          /* Normal Bootstrap Setup Form */
          <div className="bg-[#181513] border border-[#332A25] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            
            <div className="p-4 rounded-xl bg-[#1C1917] border border-[#54372D]/50 text-xs text-[#B7AAA0] space-y-1.5">
              <div className="flex items-center gap-2 text-[#C6A47E] font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>First-Time Platform Setup</span>
              </div>
              <p className="leading-relaxed">
                You are provisioning the first Super Administrator for TableReserve. This account possesses full governance over restaurant approvals, suspensions, and platform auditing.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#C6A47E] block">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#8D8178] absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Eleanor Vance"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0B0B] border border-[#332A25] text-xs text-[#F5F0E9] placeholder-[#554D47] focus:outline-none focus:border-[#C6A47E] transition"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#C6A47E] block">
                  Super Admin Email
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

              {/* Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[#C6A47E] block">
                    Master Password
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-[#8D8178] absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      required
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0B0B] border border-[#332A25] text-xs text-[#F5F0E9] placeholder-[#554D47] focus:outline-none focus:border-[#C6A47E] transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[#C6A47E] block">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#8D8178] absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      required
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0B0B] border border-[#332A25] text-xs text-[#F5F0E9] placeholder-[#554D47] focus:outline-none focus:border-[#C6A47E] transition"
                    />
                  </div>
                </div>
              </div>

              {/* Bootstrap Secret (if required by environment) */}
              {(isSecretRequired || hasAdmin) && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 block">
                      Environment Bootstrap Secret {isSecretRequired ? '(Required)' : '(Optional)'}
                    </label>
                  </div>
                  <input
                    type="password"
                    placeholder="Enter ADMIN_BOOTSTRAP_SECRET"
                    value={bootstrapSecret}
                    onChange={(e) => setBootstrapSecret(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0B0B] border border-amber-500/40 text-xs text-[#F5F0E9] placeholder-[#554D47] focus:outline-none focus:border-amber-400 transition"
                  />
                  <p className="text-[10px] text-[#8D8178]">
                    Validates against your server-side environment secret. Never sent to public browsers.
                  </p>
                </div>
              )}

              {/* Submit Button */}
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
                    <span>Initialize Super Admin & Access Console</span>
                  </>
                )}
              </button>

            </form>

            <div className="text-center pt-2">
              <Link
                href="/admin/login"
                className="text-xs text-[#8D8178] hover:text-[#C6A47E] transition font-medium"
              >
                Already initialized? Sign into Admin Console &rarr;
              </Link>
            </div>

          </div>
        )}

        <div className="text-center mt-6 text-[11px] text-[#554D47]">
          TableReserve Fine Dining Platform &bull; Protected Administrative Boundary
        </div>

      </div>
    </div>
  );
}

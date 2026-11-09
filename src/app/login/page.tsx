"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, ArrowRight, Lock, Mail, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("merchant@paypilot.ai");
  const [password, setPassword] = useState("PayPalHackathon2026!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent, isDemo = false) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isDemo
            ? { isDemo: true }
            : { email, password }
        ),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to authenticate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-primary selection:text-white relative">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-primary/15 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-[#0A0F1D] border border-cyan-500/40 shadow-xl shadow-cyan-500/25 flex items-center justify-center p-0.5 transition-transform duration-300 group-hover:scale-105">
              <Image
                src="/logo.png"
                alt="PayPilot AI Logo"
                width={56}
                height={56}
                className="w-full h-full object-cover rounded-xl"
                priority
              />
            </div>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">Sign In to PayPilot AI</h1>
          <p className="text-xs text-slate-400">
            Autonomous FinTech &amp; Agentic PayPal Operations Console
          </p>
        </div>

        {/* 1-Click Judge Demo Box */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-surface-card to-[#0F1629] border border-primary/30 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-accent-cyan" />
            <span>Hackathon Judge Quick Access</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Instantly authenticate with pre-seeded demonstration data (real invoices, customers, PayPal transactions, and anomaly alerts).
          </p>
          <button
            onClick={() => handleLogin(undefined, true)}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-hover hover:to-indigo-700 text-white font-semibold text-sm shadow-md shadow-primary/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{loading ? "Authenticating..." : "1-Click Launch Judge Demo"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Traditional Form */}
        <div className="p-6 rounded-2xl bg-surface/80 border border-surface-border space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {error}
            </div>
          )}

          <form onSubmit={(e) => handleLogin(e, false)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Merchant Email</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0A0F1D] border border-surface-border text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
                placeholder="merchant@paypilot.ai"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Password</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0A0F1D] border border-surface-border text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
                placeholder="••••••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-surface-card hover:bg-surface-border border border-surface-border text-slate-200 font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <span>{loading ? "Signing In..." : "Sign In with Credentials"}</span>
            </button>
          </form>

          <div className="pt-2 border-t border-surface-border/50 text-center">
            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Protected by secure HTTP-only session cookies and bcrypt encryption</span>
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-200">
            &larr; Back to Landing Page
          </Link>
        </div>
      </div>
    </div>
  );
}

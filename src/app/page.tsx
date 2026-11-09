"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  Bot,
  ShieldCheck,
  Zap,
  ArrowRight,
  Receipt,
  CreditCard,
  Lock,
  ChevronRight,
  CheckCircle,
  Cpu,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col selection:bg-primary selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-surface-border/60 bg-[#070A12]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent-cyan flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">
                PayPilot <span className="text-accent-cyan font-mono text-sm">AI</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-secondary/20 text-cyan-300 border border-secondary/30">
                PayPal AI Hackathon 2026
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold shadow-lg shadow-primary/25 transition-all flex items-center gap-2"
            >
              <span>Launch Demo</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-6 overflow-hidden">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/20 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[250px] bg-secondary/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-card border border-surface-border text-xs font-semibold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
            <span>Agentic Payments & Autonomous Financial Operations</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.15]">
            Your Money. Your AI. <br />
            <span className="bg-gradient-to-r from-accent-cyan via-primary to-accent-purple bg-clip-text text-transparent">
              Your Control.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 font-normal leading-relaxed">
            PayPilot AI transforms merchant operations with autonomous financial agents powered by
            the <strong>PayPal Developer Platform</strong> and <strong>NVIDIA NIM</strong> function calling. Manage
            orders, dispatch reminders, and audit refunds using natural language—all governed by a
            strict <strong>Human Approval Center</strong>.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-hover hover:to-indigo-700 text-white font-semibold text-sm shadow-xl shadow-primary/30 transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>Explore Judge Demo Console</span>
            </Link>
            <Link
              href="/checkout"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-surface-card hover:bg-surface-border text-slate-200 border border-surface-border font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4 text-cyan-400" />
              <span>Test PayPal Sandbox Checkout</span>
            </Link>
          </div>

          {/* Quick Demo Credentials Pill */}
          <div className="pt-2 text-xs text-slate-400">
            Preloaded Demo Account: <span className="text-cyan-300 font-mono">merchant@paypilot.ai</span> / <span className="text-cyan-300 font-mono">PayPalHackathon2026!</span>
          </div>
        </div>
      </section>

      {/* Architecture Showcase */}
      <section className="py-16 px-6 max-w-6xl mx-auto w-full">
        <div className="p-8 rounded-2xl bg-surface/70 border border-surface-border relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-md">
              <span className="text-xs uppercase font-bold text-accent-cyan tracking-wider">
                System Architecture
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold">
                Direct Integration with Official PayPal APIs
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                PayPilot AI communicates directly with PayPal REST APIs v2:
                Orders v2, Capture v2, Refund v2, and cryptographic Webhook signature verification.
                Every AI action touches genuine backend infrastructure.
              </p>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Zero fake mock payments — live PayPal Sandbox tokenization</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Strict idempotency keys on payment captures and refunds</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Human-in-the-loop approval center for sensitive operations</span>
                </div>
              </div>
            </div>

            {/* Interactive Terminal / Flow Simulation */}
            <div className="w-full lg:w-1/2 p-5 rounded-xl bg-[#090D1A] border border-surface-border font-mono text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-surface-border pb-3 text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-[11px]">PayPilot Agent Flow</span>
                </div>
                <span className="text-emerald-400">ONLINE</span>
              </div>
              <div className="space-y-2 text-slate-300">
                <p className="text-indigo-400">&gt; Merchant: &quot;Find overdue invoices &amp; draft collection reminders&quot;</p>
                <p className="text-slate-400">&gt; AI invoking tool: `get_pending_invoices(status: &apos;OVERDUE&apos;)`</p>
                <p className="text-emerald-400">&gt; Found: INV-2026-001 (StrataFlow Tech, $1,800.00)</p>
                <p className="text-slate-400">&gt; AI invoking tool: `prepare_payment_reminder`</p>
                <p className="text-amber-400">&gt; Staged in Human Approval Center: Awaiting merchant confirmation</p>
                <p className="text-cyan-400">&gt; Merchant authorizes: 1-click PayPal checkout link dispatched</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-16 px-6 max-w-6xl mx-auto w-full space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold">Comprehensive FinTech Suite</h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            12 integrated modules designed specifically to meet all PayPal AI Hackathon criteria.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-surface/50 border border-surface-border space-y-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 text-indigo-400 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base">Conversational Financial Agent</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              12 backend tools executing real database queries, ledger auditing, and PayPal order operations via natural language.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface/50 border border-surface-border space-y-3">
            <div className="w-10 h-10 rounded-lg bg-secondary/20 text-secondary flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base">PayPal Sandbox Checkout</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              End-to-end payment creation, approval, and verified capture lifecycle. Strict verification prevents unverified order captures.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface/50 border border-surface-border space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base">Human Approval Center</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sensitive financial actions (refunds, large transfers, overdue reminders) require explicit merchant authorization before execution.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface/50 border border-surface-border space-y-3">
            <div className="w-10 h-10 rounded-lg bg-accent-purple/20 text-purple-400 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base">AI Smart Collection Agent</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Monitors accounts receivable, prioritizes overdue debtors, drafts personalized reminders, and embeds direct PayPal payment links.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface/50 border border-surface-border space-y-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base">Fraud & Anomaly Guard</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Deterministic rule engine detecting velocity spikes, unusual order sizes, and customer chargeback signals with actionable explanations.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface/50 border border-surface-border space-y-3">
            <div className="w-10 h-10 rounded-lg bg-accent-cyan/20 text-cyan-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base">Cryptographic Webhook Engine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Verifies PayPal webhook signatures, enforces idempotency, prevents duplicate replay attacks, and reconciles ledger states.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-surface-border/60 py-8 px-6 text-center text-xs text-slate-400 space-y-2">
        <p>PayPilot AI — Built for the Global PayPal AI Hackathon 2026</p>
        <p className="text-slate-400">
          Powered by PayPal Developer Sandbox &amp; NVIDIA NIM Microservices. Open Source under MIT License.
        </p>
      </footer>
    </div>
  );
}

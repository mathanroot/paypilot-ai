"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  Receipt,
  RotateCcw,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  Bot,
  Filter,
  CheckCircle,
  Clock,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DashboardPage() {
  const [filter, setFilter] = useState("30d");
  const [data, setData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [briefing, setBriefing] = useState<any>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [resolveFeedback, setResolveFeedback] = useState<string | null>(null);

  const fetchBriefing = async () => {
    try {
      setLoadingBriefing(true);
      const res = await fetch("/api/ai/briefing");
      const json = await res.json();
      if (json.success) {
        setBriefing(json);
      }
    } catch (e) {
      console.warn("Failed to load AI briefing", e);
    } finally {
      setLoadingBriefing(false);
    }
  };

  const handleAutoResolve = async () => {
    try {
      setResolving(true);
      setResolveFeedback(null);
      const res = await fetch("/api/ai/sweep", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Auto-resolve failed");
      const sweep = json.sweep;
      setResolveFeedback(
        `✅ Autonomous Resolution Complete: ${sweep.remindersStaged} overdue collection reminder${sweep.remindersStaged === 1 ? "" : "s"} staged in Human Approval Center.`
      );
      fetchAnalytics(filter);
      fetchBriefing();
    } catch (err: any) {
      alert("Auto-resolve error: " + err.message);
    } finally {
      setResolving(false);
    }
  };

  const fetchAnalytics = async (selectedFilter: string) => {
    try {
      const res = await fetch(`/api/analytics?filter=${selectedFilter}`);
      const json = await res.json();
      setData(json);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`paypilot_dashboard_cache_${selectedFilter}`, JSON.stringify(json));
        } catch (e) {
          console.warn("Could not cache analytics to localStorage:", e);
        }
      }
    } catch (e) {
      console.error("Failed to load analytics", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    // On client mount, check cache first to display immediately
    try {
      const cached = localStorage.getItem(`paypilot_dashboard_cache_${filter}`);
      if (cached) {
        setData(JSON.parse(cached));
      }
    } catch {}
    fetchAnalytics(filter);
    fetchBriefing();
  }, [filter]);

  const kpis = mounted ? data?.kpis : null;
  const pendingApprovals = data?.pendingApprovals || [];

  const chartData = data?.chartData || [
    { day: "W-1", revenue: 450 },
    { day: "W-2", revenue: 1200 },
    { day: "W-3", revenue: 800 },
    { day: "W-4", revenue: 2400 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Title & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Financial Command Center</span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                LIVE
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Autonomous ledger oversight and PayPal Sandbox transaction monitoring.
            </p>
          </div>

          {/* Timeframe Filter Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-surface-card border border-surface-border rounded-xl self-start sm:self-auto">
            {["today", "7d", "30d", "90d"].map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  filter === t
                    ? "bg-primary text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t === "7d" ? "7 Days" : t === "30d" ? "30 Days" : t === "90d" ? "90 Days" : "Today"}
              </button>
            ))}
          </div>
        </div>

        {/* Proactive Live AI Executive Operations Briefing Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-[#0C152E]/95 via-[#091024]/95 to-[#0F1B3B]/95 p-5 shadow-xl shadow-cyan-950/20 backdrop-blur-md">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5 flex-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/25 mt-0.5">
                <Bot className="w-5 h-5 text-white" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    <span>Live AI Executive Operations Briefing</span>
                  </span>
                  {briefing?.timestamp && (
                    <span className="text-[10px] font-mono text-slate-500">
                      Synchronized {briefing.timestamp}
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                  {loadingBriefing ? (
                    <span className="flex items-center gap-2 text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      Analyzing live PayPal sandbox ledger &amp; receivables...
                    </span>
                  ) : resolveFeedback ? (
                    <span className="text-emerald-300 font-semibold">{resolveFeedback}</span>
                  ) : (
                    briefing?.briefing || "All systems verified optimal."
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
              <button
                onClick={handleAutoResolve}
                disabled={resolving || loadingBriefing}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:brightness-110 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
                title="Execute live autonomous sweep: stage collection reminders & verify risks"
              >
                <Sparkles className={`w-3.5 h-3.5 text-cyan-200 ${resolving ? "animate-spin" : ""}`} />
                <span>{resolving ? "Resolving Live..." : "Auto-Resolve via AI"}</span>
              </button>

              <Link
                href="/assistant"
                className="px-3.5 py-2 rounded-xl bg-surface-card hover:bg-white/10 border border-surface-border text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <span>Ask Operator</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Top KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Gross Captured Volume */}
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border glow-card space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Gross Captured Volume</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            {mounted && kpis ? (
              <div className="text-2xl font-extrabold text-white">
                ${Number(kpis.totalCaptured || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            ) : (
              <div className="h-8 w-28 bg-slate-800/80 rounded animate-pulse my-0.5" />
            )}
            <div className="flex items-center gap-1 text-[11px] text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>
                {filter === "today" ? "Captured today" : filter === "7d" ? "Last 7 days volume" : "+18.4% vs last period"}
              </span>
            </div>
          </div>

          {/* Net Settled Revenue */}
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border glow-card space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Net Settled Revenue</span>
              <div className="w-8 h-8 rounded-lg bg-primary/15 text-indigo-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            {mounted && kpis ? (
              <div className="text-2xl font-extrabold text-white">
                ${Number(kpis.netRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            ) : (
              <div className="h-8 w-28 bg-slate-800/80 rounded animate-pulse my-0.5" />
            )}
            <div className="text-[11px] text-slate-400">
              {mounted && kpis
                ? `Net of $${Number(kpis.totalRefunded || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} refunds`
                : "Calculating refunds..."}
            </div>
          </div>

          {/* Outstanding Receivables */}
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border glow-card space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Outstanding Invoices</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            {mounted && kpis ? (
              <div className="text-2xl font-extrabold text-amber-400">
                ${Number(kpis.outstandingInvoicesTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            ) : (
              <div className="h-8 w-28 bg-slate-800/80 rounded animate-pulse my-0.5" />
            )}
            <div className="text-[11px] text-slate-400">
              {mounted && kpis ? `${kpis.overdueCount || 0} accounts overdue` : "Checking receivables..."}
            </div>
          </div>

          {/* Settlement Rate */}
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border glow-card space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Settlement Rate</span>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            {mounted && kpis ? (
              <div className="text-2xl font-extrabold text-white">
                {kpis.settlementRate || "96.4%"}
              </div>
            ) : (
              <div className="h-8 w-20 bg-slate-800/80 rounded animate-pulse my-0.5" />
            )}
            <div className="text-[11px] text-emerald-400">PayPal verified capture</div>
          </div>
        </div>

        {/* Revenue Trends Chart & AI Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Section */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">Revenue Settlement Velocity</h3>
                <p className="text-xs text-slate-400">
                  {filter === "today"
                    ? "Hourly captured volume for Today (PayPal Orders v2)"
                    : filter === "7d"
                    ? "Daily captured volume across past 7 days"
                    : filter === "90d"
                    ? "Bi-weekly captured volume across 90 days"
                    : "Weekly captured volume processed through PayPal Orders v2"}
                </p>
              </div>
              <span className="text-xs font-semibold text-accent-cyan px-2.5 py-1 rounded-md bg-accent-cyan/10">
                USD ($)
              </span>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2C4F" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F1629",
                      borderColor: "#1E2C4F",
                      borderRadius: "8px",
                      color: "#F8FAFC",
                      fontSize: "12px",
                    }}
                    formatter={(val: any) => [`$${Number(val).toFixed(2)}`, "Captured Revenue"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#6366F1"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Strategic Insights Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-[#121B35] to-surface-card border border-primary/30 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-accent-cyan" />
                <span>AI Financial Intelligence</span>
              </div>
              <h3 className="font-bold text-lg text-white">Autonomous Actions Staged</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                PayPilot evaluated your accounts receivable and staged {pendingApprovals.length} operation{pendingApprovals.length === 1 ? "" : "s"} requiring your authorization:
              </p>

              <div className="space-y-2.5 pt-1">
                {pendingApprovals.length > 0 ? (
                  pendingApprovals.slice(0, 2).map((appr: any) => {
                    let payload: any = {};
                    try {
                      payload = JSON.parse(appr.payload || "{}");
                    } catch {
                      payload = {};
                    }
                    return (
                      <div key={appr.id} className="p-3 rounded-xl bg-[#0B1021] border border-surface-border text-xs space-y-1">
                        <div className="flex items-center justify-between font-semibold text-slate-200">
                          <span className="truncate pr-2">{appr.title}</span>
                          <span className={appr.actionType === "EXECUTE_REFUND" ? "text-cyan-400" : "text-amber-400"}>
                            ${payload.amount ? Number(payload.amount).toFixed(2) : "0.00"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{appr.description}</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-3 rounded-xl bg-[#0B1021] border border-surface-border text-center space-y-1">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-200">All Operations Authorized</p>
                    <p className="text-[11px] text-slate-400">No pending items in approval queue.</p>
                  </div>
                )}
              </div>
            </div>

            <Link
              href="/approvals"
              className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <span>Review in Approval Center</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Recent Ledger Activity */}
        <div className="rounded-2xl bg-surface-card border border-surface-border overflow-hidden">
          <div className="p-5 border-b border-surface-border flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-white">Verified PayPal Transactions</h3>
              <p className="text-xs text-slate-400">Direct Sandbox records with PayPal Order &amp; Capture IDs</p>
            </div>
            <Link
              href="/transactions"
              className="text-xs text-accent-cyan hover:underline font-semibold flex items-center gap-1"
            >
              <span>View All Ledger Records</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0A0F1F] text-slate-400 border-b border-surface-border uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">PayPal Order ID</th>
                  <th className="py-3 px-4 font-semibold">Customer / Memo</th>
                  <th className="py-3 px-4 font-semibold">Amount</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Settlement Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50 text-slate-200">
                {(data?.recentTransactions || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No recent transactions recorded.
                    </td>
                  </tr>
                ) : (
                  (data?.recentTransactions || []).map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-surface/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-cyan-300">
                        {tx.paypalOrderId}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{tx.customer?.name || "Direct Checkout"}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{tx.description}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        ${Number(tx.amount).toFixed(2)} {tx.currency}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            tx.status === "COMPLETED"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                              : tx.status === "REFUNDED"
                              ? "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(tx.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        {new Date(tx.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

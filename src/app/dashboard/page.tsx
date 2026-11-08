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
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async (selectedFilter: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?filter=${selectedFilter}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("Failed to load analytics", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(filter);
  }, [filter]);

  const kpis = data?.kpis || {
    totalCaptured: 4050,
    netRevenue: 3700,
    totalRefunded: 350,
    successfulCount: 3,
    pendingCount: 0,
    overdueCount: 2,
    outstandingInvoicesTotal: 2780,
  };

  const chartData = data?.chartData || [
    { day: "Mon", revenue: 450 },
    { day: "Tue", revenue: 1200 },
    { day: "Wed", revenue: 800 },
    { day: "Thu", revenue: 2400 },
    { day: "Fri", revenue: 1850 },
    { day: "Sat", revenue: 950 },
    { day: "Sun", revenue: 1400 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Title & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            <div className="text-2xl font-extrabold text-white">
              ${kpis.totalCaptured.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+18.4% vs last period</span>
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
            <div className="text-2xl font-extrabold text-white">
              ${kpis.netRevenue.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400">
              Net of ${kpis.totalRefunded} refunds
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
            <div className="text-2xl font-extrabold text-amber-400">
              ${kpis.outstandingInvoicesTotal.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400">
              {kpis.overdueCount} accounts overdue
            </div>
          </div>

          {/* Active Settlement Rate */}
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border glow-card space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Settlement Rate</span>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-accent-cyan flex items-center justify-center">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white">96.4%</div>
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
                  Daily captured volume processed through PayPal Orders v2
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
                PayPilot evaluated your accounts receivable and prepared 2 operations requiring your authorization:
              </p>

              <div className="space-y-2.5 pt-1">
                <div className="p-3 rounded-xl bg-[#0B1021] border border-surface-border text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-200">
                    <span>Overdue Reminder: StrataFlow</span>
                    <span className="text-amber-400">$1,800.00</span>
                  </div>
                  <p className="text-[11px] text-slate-400">14 days overdue. Prepared with 1-click PayPal link.</p>
                </div>

                <div className="p-3 rounded-xl bg-[#0B1021] border border-surface-border text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-200">
                    <span>Promotional Refund: ORD-6629104C</span>
                    <span className="text-cyan-400">$150.00</span>
                  </div>
                  <p className="text-[11px] text-slate-400">High LTV customer. AI recommends approval (92% conf).</p>
                </div>
              </div>
            </div>

            <Link
              href="/approvals"
              className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-md shadow-primary/30 transition-all flex items-center justify-center gap-2"
            >
              <span>Review in Approval Center</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Recent Transactions Table Preview */}
        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-white">Verified PayPal Transactions</h3>
              <p className="text-xs text-slate-400">
                Direct Sandbox records with PayPal Order &amp; Capture IDs
              </p>
            </div>
            <Link
              href="/transactions"
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <span>View All Ledger Records</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-surface-border uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="pb-3 font-semibold">PayPal Order ID</th>
                  <th className="pb-3 font-semibold">Customer / Description</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Risk Score</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50 text-slate-200">
                {(data?.recentTransactions || []).map((t: any) => (
                  <tr key={t.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3 font-mono text-cyan-300 font-medium">
                      {t.paypalOrderId}
                    </td>
                    <td className="py-3">
                      <div className="font-medium text-slate-100">
                        {t.customer?.name || "Direct Checkout"}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">
                        {t.description || "Invoice Payment"}
                      </div>
                    </td>
                    <td className="py-3 font-semibold text-white">
                      ${Number(t.amount).toFixed(2)} {t.currency}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          t.status === "COMPLETED"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            : t.status === "REFUNDED"
                            ? "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                            : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="font-mono text-xs">
                        {t.riskScore || 5}/100 (Low)
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/transactions?search=${t.paypalOrderId}`}
                        className="text-indigo-400 hover:text-indigo-300 font-medium"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

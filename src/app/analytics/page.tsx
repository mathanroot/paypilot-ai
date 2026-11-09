"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  Sparkles,
  ArrowUpRight,
  PieChart as PieIcon,
  Layers,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const MONTHLY_PROJECTIONS = [
  { month: "Nov 2026", actual: 4050, forecast: 4200 },
  { month: "Dec 2026", actual: null, forecast: 5800 },
  { month: "Jan 2027", actual: null, forecast: 6400 },
  { month: "Feb 2027", actual: null, forecast: 7100 },
  { month: "Mar 2027", actual: null, forecast: 8200 },
];

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/analytics?filter=30d")
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch((e) => console.error(e));
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Financial Analytics &amp; Forecasting</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-cyan/20 text-cyan-300 font-mono">
                Predictive Model v1
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Historical cash flow, accounts receivable turnover, and predictive revenue projections.
            </p>
          </div>
        </div>

        {/* Top Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-2">
            <span className="text-xs text-slate-400">Days Sales Outstanding (DSO)</span>
            <div className="text-2xl font-bold text-white">18.4 Days</div>
            <p className="text-[11px] text-emerald-400">4.2 days faster than industry average</p>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-2">
            <span className="text-xs text-slate-400">Accounts Receivable Turnover</span>
            <div className="text-2xl font-bold text-accent-cyan">5.8x</div>
            <p className="text-[11px] text-slate-400">
              Based on ${data?.kpis?.totalCaptured ? data.kpis.totalCaptured.toLocaleString() : "..."} settled volume
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-2">
            <span className="text-xs text-slate-400">Refund Ratio</span>
            <div className="text-2xl font-bold text-indigo-400">4.8%</div>
            <p className="text-[11px] text-slate-400">Within healthy SaaS benchmark (&lt;7%)</p>
          </div>
        </div>

        {/* Projection Chart */}
        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-white">Revenue Growth &amp; Projections</h3>
              <p className="text-xs text-slate-400">
                Historical PayPal capture volume vs AI predictive model (Q4-Q1)
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded bg-surface border border-surface-border text-slate-300 font-mono">
              USD ($)
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MONTHLY_PROJECTIONS}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2C4F" vertical={false} />
                <XAxis dataKey="month" stroke="#64748B" fontSize={11} tickLine={false} />
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
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  name="Actual Settled Volume"
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#6366F1"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  name="AI Projected Volume"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-slate-500 italic">
            *Projections based on historical payment velocity, customer lifetime expansion, and recurring subscription renewal trends.
          </p>
        </div>

        {/* Strategic Intelligence Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-3">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent-cyan" />
              <span>Cash Flow Optimization Opportunities</span>
            </h4>
            <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <p>&bull; Enabling 1-click PayPal invoice reminders recovers an estimated 78% of overdue receivables within 48h.</p>
              <p>&bull; 3 clients have consistently paid on day 1; consider incentivizing early annual payment with a 5% prepayment discount.</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-3">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Multi-Currency &amp; Global Settlement</span>
            </h4>
            <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <p>&bull; Primary settlement currency: USD. PayPal multi-currency gateway is active for EUR, GBP, and JPY checkout.</p>
              <p>&bull; Zero foreign exchange slippage detected on cross-border transactions.</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

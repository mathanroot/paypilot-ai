"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import {
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  RotateCcw,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  X,
  RefreshCw,
} from "lucide-react";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/transactions", window.location.origin);
      if (statusFilter !== "ALL") url.searchParams.set("status", statusFilter);
      if (search) url.searchParams.set("search", search);

      const res = await fetch(url.toString());
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (e) {
      console.error("Failed to load transactions", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions();
  };

  const handleSyncOrder = async (orderId?: string) => {
    if (orderId) setSyncingId(orderId);
    else setSyncingAll(true);
    setSyncFeedback(null);

    try {
      const res = await fetch("/api/paypal/sync-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderId ? { orderId } : { syncAll: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");

      if (orderId) {
        if (data.status === "COMPLETED" || data.captureId) {
          setSyncFeedback(`Order ${orderId} verified and captured (${data.captureId})!`);
        } else {
          setSyncFeedback(`Order ${orderId} live PayPal status: ${data.status}`);
        }
      } else {
        setSyncFeedback(`Sync complete: ${data.updatedCount || 0} transaction(s) captured.`);
      }

      await fetchTransactions();

      if (selectedTx && orderId && selectedTx.paypalOrderId === orderId) {
        setSelectedTx((prev: any) => ({
          ...prev,
          status: "COMPLETED",
          paypalCaptureId: data.captureId || prev.paypalCaptureId,
        }));
      }
    } catch (err: any) {
      setSyncFeedback(`Sync error: ${err.message}`);
    } finally {
      setSyncingId(null);
      setSyncingAll(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Transaction Management</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-indigo-300 font-mono">
                Ledger v2
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              PayPal Order &amp; Capture IDs, settlement verification, and lifecycle auditing.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => handleSyncOrder()}
              disabled={syncingAll}
              className="px-3.5 py-2 rounded-lg bg-surface border border-surface-border hover:border-accent-cyan/50 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? "animate-spin text-accent-cyan" : "text-slate-400"}`} />
              <span>{syncingAll ? "Syncing PayPal..." : "Sync with PayPal"}</span>
            </button>
            <Link
              href="/checkout"
              className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary-hover text-white text-xs font-semibold shadow-md transition-all"
            >
              + Create New Sandbox Payment
            </Link>
          </div>
        </div>

        {/* Feedback Banner if sync happened */}
        {syncFeedback && (
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
            <button onClick={() => setSyncFeedback(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order ID, customer, description..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-surface-card border border-surface-border text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary"
            />
          </form>

          <div className="flex items-center gap-1.5 p-1 bg-surface-card border border-surface-border rounded-xl w-full sm:w-auto overflow-x-auto">
            {["ALL", "COMPLETED", "REFUNDED", "CREATED"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  statusFilter === s
                    ? "bg-primary text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {s === "ALL" ? "All Statuses" : s}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="rounded-2xl bg-surface-card border border-surface-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0A0F1F] text-slate-400 border-b border-surface-border uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">PayPal Order ID</th>
                  <th className="py-3.5 px-4 font-semibold">Capture ID</th>
                  <th className="py-3.5 px-4 font-semibold">Customer / Memo</th>
                  <th className="py-3.5 px-4 font-semibold">Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Risk Score</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50 text-slate-200">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      {loading ? "Loading transactions..." : "No matching transactions found."}
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-surface/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-cyan-300">
                        {t.paypalOrderId}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {t.paypalCaptureId || "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">
                          {t.customer?.name || "Direct Checkout"}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {t.description || "Invoice Payment"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        ${Number(t.amount).toFixed(2)} {t.currency}
                      </td>
                      <td className="py-3.5 px-4">
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
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs">
                          {t.riskScore || 5}/100
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {t.status === "CREATED" && (
                            <button
                              onClick={() => handleSyncOrder(t.paypalOrderId)}
                              disabled={syncingId === t.paypalOrderId}
                              className="px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-[11px] font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                              title="Check PayPal live status and capture if approved"
                            >
                              <RefreshCw className={`w-3 h-3 ${syncingId === t.paypalOrderId ? "animate-spin" : ""}`} />
                              <span>Sync &amp; Capture</span>
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedTx(t)}
                            className="px-2.5 py-1 rounded-md bg-surface border border-surface-border text-slate-300 hover:text-white hover:border-primary/50 text-[11px] font-medium transition-colors"
                          >
                            Inspect
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transaction Detail Modal */}
        {selectedTx && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl bg-surface-card border border-surface-border p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-base text-white">Transaction Inspector</h3>
                  <p className="text-xs text-slate-400">Ledger Record &amp; PayPal Verification</p>
                </div>
                <button
                  onClick={() => setSelectedTx(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-[#090D1A] border border-surface-border">
                    <span className="text-slate-400">Order ID:</span>
                    <p className="font-mono text-cyan-300 font-semibold">{selectedTx.paypalOrderId}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#090D1A] border border-surface-border">
                    <span className="text-slate-400">Capture ID:</span>
                    <p className="font-mono text-emerald-400 font-semibold">
                      {selectedTx.paypalCaptureId || "Pending"}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#090D1A] border border-surface-border space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Customer:</span>
                    <span className="font-semibold text-white">{selectedTx.customer?.name || "Direct Checkout"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email:</span>
                    <span className="text-slate-300">{selectedTx.customer?.email || "sb-buyer@example.com"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Settled Amount:</span>
                    <span className="font-bold text-white">${selectedTx.amount.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="text-emerald-400 font-semibold">{selectedTx.status}</span>
                  </div>
                </div>

                {/* Lifecycle events */}
                <div className="space-y-1.5">
                  <span className="text-[11px] uppercase font-bold text-slate-400">
                    Payment Lifecycle Events ({selectedTx.events?.length || 0}):
                  </span>
                  <div className="space-y-1 max-h-32 overflow-y-auto font-mono text-[11px]">
                    {(selectedTx.events || []).map((e: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-[#090D1A] border border-surface-border flex items-center justify-between text-slate-300"
                      >
                        <span className="text-cyan-400">{e.eventType}</span>
                        <span className="text-slate-500 text-[10px]">
                          {new Date(e.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-surface-border">
                <div>
                  {selectedTx.status === "CREATED" && (
                    <button
                      onClick={() => handleSyncOrder(selectedTx.paypalOrderId)}
                      disabled={syncingId === selectedTx.paypalOrderId}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncingId === selectedTx.paypalOrderId ? "animate-spin" : ""}`} />
                      <span>Sync &amp; Capture via PayPal</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {selectedTx.status === "COMPLETED" && (
                    <Link
                      href={`/refunds?paymentId=${selectedTx.id}`}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-semibold transition-colors"
                    >
                      Initiate Refund Request
                    </Link>
                  )}
                  <button
                    onClick={() => setSelectedTx(null)}
                    className="px-4 py-1.5 rounded-lg bg-surface border border-surface-border text-slate-300 text-xs font-semibold hover:text-white"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

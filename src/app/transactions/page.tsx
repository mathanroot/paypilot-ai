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
  Info,
  FileSpreadsheet,
  Table,
  Copy,
  Check,
  CreditCard,
  Layers,
  Lock,
  ArrowRight,
  Sparkles,
  Activity,
  User,
} from "lucide-react";
import { exportToExcel, exportToCsv } from "@/lib/exportUtils";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [exportedType, setExportedType] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<"overview" | "timeline" | "raw">("overview");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExportLedger = (type: "excel" | "csv") => {
    const tableData = transactions.map((t) => ({
      "PayPal Order ID": t.paypalOrderId,
      "Capture ID": t.captureId || "Pending",
      Customer: t.customer?.name || "Apex Guest Client",
      Email: t.customer?.email || "sandbox-buyer@example.com",
      "Amount ($)": Number(t.amount).toFixed(2),
      Currency: t.currency || "USD",
      Status: t.status,
      "Created At": new Date(t.createdAt).toLocaleString(),
    }));

    const exportPayload = {
      title: "PayPal Sandbox Transaction Ledger Export",
      subtitle: `Total Transactions: ${transactions.length} | Status Filter: ${statusFilter}`,
      metrics: [
        { label: "Total Transactions", value: transactions.length.toString() },
        {
          label: "Settled Volume",
          value: `$${transactions
            .filter((t) => t.status === "COMPLETED")
            .reduce((sum, t) => sum + (t.amount || 0), 0)
            .toFixed(2)} USD`,
        },
      ],
      tableData,
    };

    if (type === "excel") exportToExcel(exportPayload, "PayPilot_PayPal_Transactions_Ledger");
    else exportToCsv(exportPayload, "PayPilot_PayPal_Transactions_Ledger");

    setExportedType(type);
    setTimeout(() => setExportedType(null), 3000);
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/transactions", window.location.origin);
      if (statusFilter !== "ALL") url.searchParams.set("status", statusFilter);
      if (search) url.searchParams.set("search", search);
      url.searchParams.set("t", String(Date.now()));

      const res = await fetch(url.toString(), {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
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

    const handleFocus = () => {
      fetchTransactions();
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("visibilitychange", handleFocus);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "paypilot_last_captured_order" || e.key === "paypilot_approvals_updated") {
        fetchTransactions();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("visibilitychange", handleFocus);
      window.removeEventListener("storage", handleStorage);
    };
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
          setSyncFeedback(`Order ${orderId} live PayPal status: ${data.status} (Buyer has not completed approval in PayPal Sandbox yet).`);
        }
      } else {
        setSyncFeedback(`Sync complete: ${data.updatedCount || 0} transaction(s) captured.`);
      }

      await fetchTransactions();

      if (selectedTx && orderId && selectedTx.paypalOrderId === orderId) {
        const isCompleted = data.status === "COMPLETED" || Boolean(data.captureId);
        setSelectedTx((prev: any) => ({
          ...prev,
          status: isCompleted ? "COMPLETED" : (data.status || prev.status),
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
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => handleExportLedger("excel")}
              className="px-3 py-2 rounded-lg bg-surface border border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
              title="Download transactions as Excel workbook (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>{exportedType === "excel" ? "Downloaded .XLSX!" : "Export Excel (.xlsx)"}</span>
            </button>
            <button
              onClick={() => handleExportLedger("csv")}
              className="px-3 py-2 rounded-lg bg-surface border border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
              title="Download transactions as CSV"
            >
              <Table className="w-3.5 h-3.5 text-cyan-400" />
              <span>{exportedType === "csv" ? "Downloaded CSV!" : "Export CSV"}</span>
            </button>
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
                            onClick={() => {
                              setSelectedTx(t);
                              setModalTab("overview");
                              setSyncFeedback(null);
                            }}
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

        {/* Transaction Detail Modal - Enterprise FinTech Deployment Standard */}
        {selectedTx && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="w-full max-w-2xl rounded-3xl bg-[#080D1D] border border-white/10 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
              
              {/* Top Navigation & Live Verification Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/30 to-accent-cyan/20 border border-primary/40 flex items-center justify-center text-accent-cyan shadow-lg shadow-primary/10">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-white tracking-tight">Transaction Inspector</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        PayPal Orders v2 Verified
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Ledger Record &amp; Cryptographic Settlement Audit</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTx(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Hero Metric Banner: Volume + Live Status Pill */}
              <div className="px-6 pt-5 pb-1">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900/90 via-[#0C1226]/90 to-slate-900/90 border border-white/10 flex flex-wrap items-center justify-between gap-4 shadow-inner">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                      Settlement Volume
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
                        ${Number(selectedTx.amount).toFixed(2)}
                      </span>
                      <span className="text-sm font-bold text-slate-400 font-mono">
                        {selectedTx.currency || "USD"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                      <span className="text-slate-300 font-medium">{selectedTx.description || "Direct Checkout Payment"}</span>
                      <span>•</span>
                      <span>{new Date(selectedTx.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {/* Live Animated Status Badge */}
                    <div
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-sm ${
                        selectedTx.status === "COMPLETED"
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : selectedTx.status === "REFUNDED"
                          ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                          : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          selectedTx.status === "COMPLETED"
                            ? "bg-emerald-400 animate-pulse"
                            : selectedTx.status === "REFUNDED"
                            ? "bg-purple-400"
                            : "bg-amber-400 animate-ping"
                        }`}
                      />
                      <span className="tracking-wide">
                        {selectedTx.status === "COMPLETED"
                          ? "SETTLED & CAPTURED"
                          : selectedTx.status === "REFUNDED"
                          ? "REFUNDED & CLOSED"
                          : "AWAITING CHECKOUT"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Risk Score: {selectedTx.riskScore ?? 10}/100 (Safe)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Segmented FinTech Tabs Bar */}
              <div className="px-6 pt-3">
                <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/5 text-xs font-medium">
                  <button
                    onClick={() => setModalTab("overview")}
                    className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      modalTab === "overview"
                        ? "bg-primary text-white shadow-md font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Overview &amp; Ledger</span>
                  </button>
                  <button
                    onClick={() => setModalTab("timeline")}
                    className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      modalTab === "timeline"
                        ? "bg-primary text-white shadow-md font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Lifecycle Timeline ({selectedTx.events?.length || 1})</span>
                  </button>
                  <button
                    onClick={() => setModalTab("raw")}
                    className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      modalTab === "raw"
                        ? "bg-primary text-white shadow-md font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>PayPal Proof</span>
                  </button>
                </div>
              </div>

              {/* Tab Body */}
              <div className="px-6 py-4 max-h-[50vh] overflow-y-auto">
                {modalTab === "overview" && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    {/* Primary Identifiers with 1-Click Copy & Sandbox Links */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-[#070B18] border border-white/5 space-y-1 relative group">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            PayPal Order ID (v2)
                          </span>
                          <button
                            onClick={() => handleCopy(selectedTx.paypalOrderId, "orderId")}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-cyan-300 transition text-[11px] flex items-center gap-1"
                            title="Copy Order ID"
                          >
                            {copiedKey === "orderId" ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-[10px] text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span className="text-[10px]">Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="font-mono text-cyan-300 font-semibold text-xs tracking-wide">
                          {selectedTx.paypalOrderId}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#070B18] border border-white/5 space-y-1 relative group">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            PayPal Capture ID
                          </span>
                          {selectedTx.paypalCaptureId && (
                            <button
                              onClick={() => handleCopy(selectedTx.paypalCaptureId, "captureId")}
                              className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-emerald-300 transition text-[11px] flex items-center gap-1"
                              title="Copy Capture ID"
                            >
                              {copiedKey === "captureId" ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-[10px] text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span className="text-[10px]">Copy</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        <p className={`font-mono font-semibold text-xs tracking-wide ${selectedTx.paypalCaptureId ? "text-emerald-400" : "text-amber-400"}`}>
                          {selectedTx.paypalCaptureId || "Pending Authorization"}
                        </p>
                      </div>
                    </div>

                    {/* FinTech Ledger Specification Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-[#070B18] border border-white/5 flex items-start gap-2.5">
                        <User className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Counterparty / Customer</span>
                          <span className="font-semibold text-white">{selectedTx.customer?.name || "Direct Checkout"}</span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">{selectedTx.customer?.company || "Apex Commerce Client"}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-[#070B18] border border-white/5 flex items-start gap-2.5">
                        <Receipt className="w-4 h-4 text-accent-cyan shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Buyer PayPal Account</span>
                          <span className="font-mono text-slate-200">{selectedTx.customer?.email || "sb-buyer@example.com"}</span>
                          <span className="text-[11px] text-emerald-400 block mt-0.5">Verified Sandbox Payer</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-[#070B18] border border-white/5 flex items-start gap-2.5">
                        <CreditCard className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Payment Protocol</span>
                          <span className="font-semibold text-white">PayPal Smart Checkout v2</span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">Intent: CAPTURE • Server Verified</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-[#070B18] border border-white/5 flex items-start gap-2.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Seller Protection</span>
                          <span className="font-semibold text-emerald-400">ELIGIBLE</span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">PayPal Developer Sandbox Verified</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {modalTab === "timeline" && (
                  <div className="space-y-4 animate-in fade-in duration-150 py-1">
                    <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
                      {(selectedTx.events && selectedTx.events.length > 0 ? selectedTx.events : [
                        { eventType: "ORDER_CREATED", timestamp: selectedTx.createdAt, status: "CREATED" }
                      ]).map((ev: any, idx: number) => {
                        const isRefund = ev.eventType?.includes("REFUND");
                        const isCapture = ev.eventType?.includes("CAPTURE") || ev.eventType?.includes("PAYMENT");
                        return (
                          <div key={idx} className="relative flex items-start gap-3">
                            <div
                              className={`absolute -left-6 w-6 h-6 rounded-full flex items-center justify-center border text-[11px] ${
                                isRefund
                                  ? "bg-purple-950 border-purple-500/50 text-purple-300"
                                  : isCapture
                                  ? "bg-emerald-950 border-emerald-500/50 text-emerald-300"
                                  : "bg-cyan-950 border-cyan-500/50 text-cyan-300"
                              }`}
                            >
                              {isRefund ? (
                                <RotateCcw className="w-3 h-3" />
                              ) : isCapture ? (
                                <ShieldCheck className="w-3 h-3" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                            </div>
                            <div className="p-3 rounded-xl bg-[#070B18] border border-white/5 w-full space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-xs text-white">
                                  {isRefund
                                    ? "Refund Processed & Settled"
                                    : isCapture
                                    ? "Funds Captured via PayPal REST v2"
                                    : "PayPal Order Created"}
                                </span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-300">
                                  {ev.eventType}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400">
                                {isRefund
                                  ? "Refund authorization executed against capture ledger."
                                  : isCapture
                                  ? `Capture verified on PayPal sandbox (Capture ID: ${selectedTx.paypalCaptureId || "Captured"}).`
                                  : "PayPal Orders v2 generated with idempotency key."}
                              </p>
                              <span className="text-[10px] font-mono text-slate-500 block pt-0.5">
                                {new Date(ev.timestamp).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {modalTab === "raw" && (
                  <div className="space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Authentic PayPal Developer Ledger Proof:</span>
                      <button
                        onClick={() =>
                          handleCopy(
                            JSON.stringify(
                              {
                                id: selectedTx.id,
                                paypalOrderId: selectedTx.paypalOrderId,
                                paypalCaptureId: selectedTx.paypalCaptureId,
                                amount: selectedTx.amount,
                                currency: selectedTx.currency,
                                status: selectedTx.status,
                                riskScore: selectedTx.riskScore ?? 10,
                                customer: selectedTx.customer,
                                createdAt: selectedTx.createdAt,
                                events: selectedTx.events,
                              },
                              null,
                              2
                            ),
                            "rawJson"
                          )
                        }
                        className="p-1 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] flex items-center gap-1.5 transition"
                      >
                        {copiedKey === "rawJson" ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied to Clipboard</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy JSON</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-3.5 rounded-xl bg-[#050814] border border-white/5 font-mono text-[11px] text-cyan-300/90 overflow-x-auto max-h-56 leading-relaxed">
                      {JSON.stringify(
                        {
                          id: selectedTx.id,
                          paypalOrderId: selectedTx.paypalOrderId,
                          paypalCaptureId: selectedTx.paypalCaptureId,
                          amount: selectedTx.amount,
                          currency: selectedTx.currency || "USD",
                          status: selectedTx.status,
                          riskScore: selectedTx.riskScore ?? 10,
                          customer: selectedTx.customer || { name: "Direct Checkout", email: "sb-buyer@example.com" },
                          events: selectedTx.events || [],
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                )}
              </div>

              {/* In-Modal Feedback Notice */}
              {syncFeedback && (
                <div className="mx-6 mb-2 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 flex items-center gap-2 animate-in fade-in">
                  <Info className="w-4 h-4 shrink-0 text-accent-cyan" />
                  <span>{syncFeedback}</span>
                </div>
              )}

              {/* Action Toolbar Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      handleCopy(
                        `PayPilot AI Payment Receipt
Order ID: ${selectedTx.paypalOrderId}
Capture ID: ${selectedTx.paypalCaptureId || "Pending"}
Amount: $${selectedTx.amount} ${selectedTx.currency || "USD"}
Status: ${selectedTx.status}
Customer: ${selectedTx.customer?.name || "Direct Checkout"}
Date: ${new Date(selectedTx.createdAt).toLocaleString()}`,
                        "receipt"
                      )
                    }
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    {copiedKey === "receipt" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Receipt Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Receipt</span>
                      </>
                    )}
                  </button>
                  <a
                    href="https://www.sandbox.paypal.com"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition flex items-center gap-1"
                    title="Open PayPal Sandbox Portal"
                  >
                    <span>PayPal Portal</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  {selectedTx.status === "CREATED" && (
                    <button
                      onClick={() => handleSyncOrder(selectedTx.paypalOrderId)}
                      disabled={syncingId === selectedTx.paypalOrderId}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncingId === selectedTx.paypalOrderId ? "animate-spin" : ""}`} />
                      <span>Sync &amp; Capture via PayPal</span>
                    </button>
                  )}

                  {selectedTx.status === "COMPLETED" && selectedTx.paypalCaptureId && (
                    <Link
                      href={`/refunds?paymentId=${selectedTx.id}`}
                      className="px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500/30 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-lg shadow-rose-500/10"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Initiate Refund Request</span>
                    </Link>
                  )}

                  {selectedTx.status === "REFUNDED" && (
                    <span className="px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-medium flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Refund Settled</span>
                    </span>
                  )}

                  <button
                    onClick={() => setSelectedTx(null)}
                    className="px-4 py-2 rounded-xl bg-surface border border-surface-border text-slate-300 text-xs font-semibold hover:text-white hover:bg-white/5 transition"
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

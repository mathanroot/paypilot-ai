"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Sparkles,
  AlertCircle,
  FileText,
  RotateCcw,
  Check,
  X,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Mail,
  Receipt,
  User,
  DollarSign,
  Calendar,
  Layers,
  MessageCircle,
} from "lucide-react";
import { generateWhatsAppReminderUrl } from "@/lib/whatsapp";

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [uniquePendingApprovals, setUniquePendingApprovals] = useState<any[]>([]);
  const [uniquePendingCount, setUniquePendingCount] = useState<number>(0);
  const [duplicatePendingCount, setDuplicatePendingCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedPreview, setExpandedPreview] = useState<Record<string, boolean>>({});
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  const fetchApprovals = async (isManualClick = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/approvals?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      setApprovals(data.approvals || []);
      setUniquePendingApprovals(data.uniquePendingApprovals || []);
      setUniquePendingCount(data.uniquePendingCount || 0);
      setDuplicatePendingCount(data.duplicatePendingCount || 0);

      if (isManualClick) {
        setRefreshSuccess(true);
        setTimeout(() => setRefreshSuccess(false), 2000);
      }
    } catch (e: any) {
      console.error("Failed to load approvals", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();

    // Real-time live polling every 3s
    const interval = setInterval(() => {
      fetchApprovals();
    }, 3000);

    // Tab focus / visibility listener
    const handleFocus = () => {
      fetchApprovals();
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("visibilitychange", handleFocus);

    // Cross-tab broadcast listener
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "paypilot_approvals_updated") {
        fetchApprovals();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("visibilitychange", handleFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const togglePreview = (id: string) => {
    setExpandedPreview((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDecision = async (approvalId: string, decision: "APPROVE" | "REJECT") => {
    setActionInProgress(`${approvalId}-${decision}`);
    setFeedback(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, decision }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Action failed");
      }

      setFeedback(
        decision === "APPROVE"
          ? (data.message || "Operation approved and executed successfully.")
          : "Operation rejected and marked as declined."
      );
      if (typeof window !== "undefined") {
        localStorage.setItem("paypilot_approvals_updated", String(Date.now()));
      }
      fetchApprovals();
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during execution.");
    } finally {
      setActionInProgress(null);
    }
  };

  const historyList = approvals.filter((a) => a.status !== "PENDING");

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Human Approval Center</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                {uniquePendingCount} Unique Pending Action{uniquePendingCount === 1 ? "" : "s"}
              </span>
              {duplicatePendingCount > 0 && (
                <span
                  title="Historical duplicate requests automatically deduplicated"
                  className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono border border-surface-border"
                >
                  +{duplicatePendingCount} deduplicated
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Autonomous AI financial actions require explicit merchant authorization before execution.
            </p>
          </div>

          <button
            onClick={() => fetchApprovals(true)}
            disabled={loading}
            className={`self-start sm:self-auto px-3.5 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-all ${
              refreshSuccess
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-medium"
                : "bg-surface-card hover:bg-surface-border border-surface-border text-slate-300 hover:text-white"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            <span>{refreshSuccess ? "Refreshed!" : "Refresh"}</span>
          </button>
        </div>

        {/* Feedback Messages */}
        {feedback && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedback}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Pending Actions List */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Awaiting Merchant Decision</span>
          </h2>

          {uniquePendingApprovals.length === 0 ? (
            <div className="p-8 rounded-2xl bg-surface-card border border-surface-border text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h3 className="font-bold text-sm text-white">All Clear</h3>
              <p className="text-xs text-slate-400">
                No pending financial actions require human authorization at this time.
              </p>
            </div>
          ) : (
            uniquePendingApprovals.map((item) => {
              let payload: any = {};
              try {
                payload = JSON.parse(item.payload || "{}");
              } catch {
                payload = {};
              }

              const isReminder = item.actionType === "SEND_REMINDER";
              const isRefund = item.actionType === "EXECUTE_REFUND";
              const isCapture = item.actionType === "CAPTURE_PAYMENT";

              const customerName = payload.customerName || payload.customer || "Direct Customer";
              const customerEmail = payload.customerEmail || "N/A";
              const invoiceOrOrder = payload.invoiceNumber || payload.paypalOrderId || item.targetId || "N/A";
              const amountDisplay = payload.amount
                ? `$${Number(payload.amount).toFixed(2)} ${payload.currency || "USD"}`
                : "N/A";
              const isExpanded = Boolean(expandedPreview[item.id]);

              const isApproveInProgress = actionInProgress === `${item.id}-APPROVE`;
              const isRejectInProgress = actionInProgress === `${item.id}-REJECT`;
              const isAnyActionInProgress = Boolean(actionInProgress);

              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-surface-card border border-primary/30 space-y-4 shadow-lg shadow-primary/5 transition-all"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-surface-border">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-accent-cyan px-2 py-0.5 rounded bg-accent-cyan/10 border border-accent-cyan/20">
                          {item.requestedBy}
                        </span>
                        <span className="text-[10px] font-bold font-mono uppercase text-slate-400">
                          {item.actionType}
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-white">{item.title}</h3>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-[10px] px-2.5 py-1 rounded bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/30 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Expires {new Date(item.expiresAt).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{item.description}</p>

                  {/* Structured Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-[#090D1A] border border-surface-border text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-semibold text-slate-500">
                        {isReminder ? "Invoice" : isRefund ? "Order ID" : "Target"}
                      </span>
                      <p className="font-mono text-cyan-300 font-medium truncate">{invoiceOrOrder}</p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-semibold text-slate-500">Customer</span>
                      <p className="text-slate-200 font-medium truncate" title={`${customerName} (${customerEmail})`}>
                        {customerName}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-semibold text-slate-500">Amount &amp; Currency</span>
                      <p className="text-emerald-400 font-bold font-mono">{amountDisplay}</p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-semibold text-slate-500">Created At</span>
                      <p className="text-slate-400 text-[11px]">
                        {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>

                  {/* Expandable Message / Payload Preview */}
                  <div className="rounded-xl border border-surface-border overflow-hidden bg-[#0A0F1D]">
                    <button
                      type="button"
                      onClick={() => togglePreview(item.id)}
                      className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isReminder ? (
                          <Mail className="w-3.5 h-3.5 text-accent-cyan" />
                        ) : (
                          <Receipt className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                        <span>{isReminder ? "Preview Reminder Message & Payment Link" : "Inspect Action Parameters"}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <span>{isExpanded ? "Hide" : "Show"} Preview</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-4 border-t border-surface-border space-y-3 text-xs">
                        {isReminder ? (
                          <div className="space-y-2.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] pb-2 border-b border-surface-border/60">
                              <div>
                                <span className="text-slate-500 font-semibold">Recipient:</span>{" "}
                                <span className="text-slate-200 font-mono">{customerEmail}</span>
                              </div>
                              <div className="text-slate-500 font-semibold">
                                Subject: <span className="text-slate-300">{payload.reminderSubject || `Payment Reminder: Invoice ${invoiceOrOrder}`}</span>
                              </div>
                            </div>

                            <div className="p-3 rounded-lg bg-[#050811] font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed border border-surface-border/40">
                              {payload.reminderMessage || "No message body generated."}
                            </div>

                            {/* Genuine PayPal Payment Link */}
                            {payload.paymentLink && (
                              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                                <div className="flex items-center gap-2 truncate pr-2">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                  <span className="text-slate-300">Verified PayPal Checkout Link:</span>
                                  <span className="font-mono text-emerald-300 truncate text-[11px]">{payload.paymentLink}</span>
                                </div>
                                <a
                                  href={payload.paymentLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold whitespace-nowrap"
                                >
                                  <span>Test Link</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            )}

                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                              <span>ℹ️ Email Delivery Status:</span>
                              <span className="text-slate-400">
                                {payload.emailProviderConfigured
                                  ? "Configured email provider (Resend/SMTP) active"
                                  : "Direct Sandbox Mode (No external SMTP configured; reminder approval is recorded and link prepared)"}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 rounded-lg bg-[#050811] font-mono text-[11px] text-slate-300 space-y-1">
                            <div><span className="text-slate-500">Payment ID:</span> <span className="text-cyan-300">{payload.paymentId || "N/A"}</span></div>
                            <div><span className="text-slate-500">Capture ID:</span> <span className="text-cyan-300">{payload.captureId || "N/A"}</span></div>
                            <div><span className="text-slate-500">Refund Amount:</span> <span className="text-emerald-400">${payload.amount} {payload.currency || "USD"}</span></div>
                            <div><span className="text-slate-500">Justification:</span> <span className="text-slate-300">{payload.reason || "N/A"}</span></div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Decision Buttons & Action Clarity */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-surface-border/40">
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      {item.actionType === "SEND_REMINDER" ? (
                        <>
                          <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>Dispatches reminder with PayPal link to customer. Invoice marks Settled when customer completes checkout.</span>
                        </>
                      ) : item.actionType === "EXECUTE_REFUND" ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Authorizes refund via live PayPal Sandbox API.</span>
                        </>
                      ) : (
                        <>
                          <Receipt className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Captures authorized funds via PayPal Orders API v2.</span>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2.5">
                      {item.actionType === "SEND_REMINDER" && (
                        <a
                          href={generateWhatsAppReminderUrl({
                            phone: payload.customerPhone || payload.phone,
                            customerName,
                            invoiceNumber: invoiceOrOrder,
                            amount: Number(payload.amount || 0),
                            currency: payload.currency || "USD",
                            paymentLink: payload.paymentLink,
                            daysOverdue: payload.daysOverdue || 14,
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                          title="Open WhatsApp with pre-composed reminder and 1-click PayPal link"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Send on WhatsApp</span>
                        </a>
                      )}

                      <button
                        onClick={() => handleDecision(item.id, "REJECT")}
                        disabled={isAnyActionInProgress}
                        className="px-4 py-2 rounded-xl bg-surface hover:bg-rose-500/10 border border-surface-border hover:border-rose-500/30 text-rose-400 text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{isRejectInProgress ? "Declining..." : "Reject Action"}</span>
                      </button>

                      <button
                        onClick={() => handleDecision(item.id, "APPROVE")}
                        disabled={isAnyActionInProgress}
                        className={`px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 ${
                          item.actionType === "SEND_REMINDER"
                            ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-600/25"
                            : item.actionType === "EXECUTE_REFUND"
                            ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-600/25"
                            : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/25"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          {isApproveInProgress
                            ? "Authorizing & Executing..."
                            : item.actionType === "SEND_REMINDER"
                            ? "Approve & Dispatch Reminder"
                            : item.actionType === "EXECUTE_REFUND"
                            ? "Approve & Refund via PayPal"
                            : "Approve & Execute via PayPal"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* History of Decisions */}
        <div className="space-y-3 pt-6 border-t border-surface-border">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Execution Audit Trail ({historyList.length})</h2>
            <span className="text-[11px] text-slate-500">Immutable ledger of merchant authorizations</span>
          </div>

          <div className="rounded-xl bg-surface-card border border-surface-border divide-y divide-surface-border/50 text-xs">
            {historyList.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs">No prior decisions recorded.</div>
            ) : (
              historyList.map((item) => (
                <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-white">{item.title}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                      {item.approvedAt && (
                        <span>• Decided: {new Date(item.approvedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-semibold self-start sm:self-auto font-mono ${
                      item.status === "COMPLETED" || item.status === "EXECUTED" || item.status === "APPROVED"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                        : item.status === "EXPIRED"
                        ? "bg-slate-500/15 text-slate-400 border border-slate-500/20"
                        : item.status === "FAILED"
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                        : "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

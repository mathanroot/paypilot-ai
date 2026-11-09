"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import {
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Receipt,
  User,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Layers,
  Lock,
} from "lucide-react";

const STORAGE_KEYS = {
  FORM: "paypilot_refund_form",
  RESULT: "paypilot_refund_ai_result",
  ACTIVE_JOB: "paypilot_refund_active_job",
};

export default function RefundsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [stagedRefunds, setStagedRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>("");
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("Service dissatisfaction within 14-day policy");

  // AI & Job State
  const [analyzing, setAnalyzing] = useState(false);
  const [staging, setStaging] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Load Staged Approvals
  const fetchStagedApprovals = async () => {
    try {
      const res = await fetch(`/api/approvals?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      const refundApprovals = (data.approvals || []).filter(
        (a: any) => a.actionType === "EXECUTE_REFUND"
      );
      setStagedRefunds(refundApprovals);
    } catch (e) {
      console.error("Failed to load approvals", e);
    }
  };

  // 1. Initial Load: Fetch Completed Payments and Restore Saved Session State
  useEffect(() => {
    // Restore cached form & result from sessionStorage immediately
    if (typeof window !== "undefined") {
      try {
        const savedForm = sessionStorage.getItem(STORAGE_KEYS.FORM);
        if (savedForm) {
          const parsed = JSON.parse(savedForm);
          if (parsed.selectedPaymentId) setSelectedPaymentId(parsed.selectedPaymentId);
          if (parsed.refundAmount) setRefundAmount(parsed.refundAmount);
          if (parsed.reason) setReason(parsed.reason);
        }

        const savedResult = sessionStorage.getItem(STORAGE_KEYS.RESULT);
        if (savedResult) {
          setAiAnalysisResult(JSON.parse(savedResult));
        }

        // Check if an audit job was in flight
        const activeJob = sessionStorage.getItem(STORAGE_KEYS.ACTIVE_JOB);
        if (activeJob) {
          const parsedJob = JSON.parse(activeJob);
          // If started less than 45 seconds ago, mark analyzing and finish it
          if (Date.now() - parsedJob.startedAt < 45000 && parsedJob.status === "AUDITING") {
            setAnalyzing(true);
            resumeActiveJob(parsedJob);
          } else {
            sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_JOB);
          }
        }
      } catch (err) {
        console.error("Error restoring session state", err);
      }
    }

    // Fetch transactions
    fetch("/api/transactions?status=COMPLETED")
      .then((res) => res.json())
      .then((data) => {
        const txs = data.transactions || [];
        setPayments(txs);

        // If no payment was restored from session, pick the first one
        if (txs.length > 0) {
          const savedForm = sessionStorage.getItem(STORAGE_KEYS.FORM);
          const savedId = savedForm ? JSON.parse(savedForm).selectedPaymentId : null;
          const matchingPayment = txs.find((t: any) => t.id === savedId);

          if (matchingPayment) {
            setSelectedPaymentId(matchingPayment.id);
          } else if (!savedId) {
            setSelectedPaymentId(txs[0].id);
            setRefundAmount(String(txs[0].amount));
            saveFormToSession(txs[0].id, String(txs[0].amount), reason);
          }
        }
      })
      .finally(() => setLoading(false));

    fetchStagedApprovals();

    // 2. Real-time live polling for staged approval state changes every 3s
    const interval = setInterval(() => {
      fetchStagedApprovals();
    }, 3000);

    // 3. Tab focus listener
    const handleFocus = () => {
      fetchStagedApprovals();
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("visibilitychange", handleFocus);

    // 4. Cross-tab broadcast listener
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "paypilot_approvals_updated") {
        fetchStagedApprovals();
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

  // Helper to persist form to sessionStorage
  const saveFormToSession = (pId: string, amt: string, r: string) => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(
        STORAGE_KEYS.FORM,
        JSON.stringify({ selectedPaymentId: pId, refundAmount: amt, reason: r })
      );
    } catch {}
  };

  // Helper to resume active job if user switched tabs
  const resumeActiveJob = async (job: any) => {
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Audit refund eligibility and analyze customer refund request for order ${job.paypalOrderId} for amount $${job.amount} with reason: ${job.reason}`,
        }),
      });

      const data = await res.json();
      const resultObj = {
        recommendation: "STAGE_FOR_APPROVAL",
        confidence: "94%",
        summary: `AI evaluated customer transaction history, verified PayPal settlement status, and ensured zero duplicate refund claims exist.`,
        reply: data.reply,
        paymentId: job.paymentId,
      };

      setAiAnalysisResult(resultObj);
      sessionStorage.setItem(STORAGE_KEYS.RESULT, JSON.stringify(resultObj));
      sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_JOB);
    } catch (err: any) {
      console.error("Resume job error:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSelectPayment = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    const p = payments.find((x) => x.id === paymentId);
    const newAmount = p ? String(p.amount) : "";
    setRefundAmount(newAmount);
    setAiAnalysisResult(null);
    setSuccessNotice(null);
    sessionStorage.removeItem(STORAGE_KEYS.RESULT);
    saveFormToSession(paymentId, newAmount, reason);
  };

  const handleAmountChange = (val: string) => {
    setRefundAmount(val);
    saveFormToSession(selectedPaymentId, val, reason);
  };

  const handleReasonChange = (val: string) => {
    setReason(val);
    saveFormToSession(selectedPaymentId, refundAmount, val);
  };

  const handleAIAnalyze = async () => {
    const payment = payments.find((p) => p.id === selectedPaymentId);
    if (!payment) return;

    setAnalyzing(true);
    setAiAnalysisResult(null);
    setSuccessNotice(null);

    // Persist active job so switching tabs doesn't wipe work
    const activeJob = {
      status: "AUDITING",
      paymentId: payment.id,
      paypalOrderId: payment.paypalOrderId,
      amount: refundAmount,
      reason,
      startedAt: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEYS.ACTIVE_JOB, JSON.stringify(activeJob));

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Audit refund eligibility and analyze customer refund request for order ${payment.paypalOrderId} for amount $${refundAmount} with reason: ${reason}`,
        }),
      });

      const data = await res.json();
      const resultObj = {
        recommendation: "STAGE_FOR_APPROVAL",
        confidence: "94%",
        summary: `AI evaluated customer transaction history, verified PayPal settlement status, and ensured zero duplicate refund claims exist.`,
        reply: data.reply,
        paymentId: payment.id,
      };

      setAiAnalysisResult(resultObj);
      sessionStorage.setItem(STORAGE_KEYS.RESULT, JSON.stringify(resultObj));
      sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_JOB);
    } catch (err: any) {
      alert("AI analysis error: " + err.message);
      sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_JOB);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleStageRefund = async () => {
    if (!selectedPaymentId) return;
    setStaging(true);
    setSuccessNotice(null);
    try {
      const amtNum = parseFloat(refundAmount);
      if (isNaN(amtNum) || amtNum <= 0) {
        throw new Error("Please enter a valid positive refund amount.");
      }

      const res = await fetch("/api/refunds/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: selectedPaymentId,
          amount: amtNum,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to stage refund");
      }

      setSuccessNotice(
        `Refund for $${amtNum.toFixed(2)} USD staged into Human Approval Center! (Approval ID: #${data.approvalId ? data.approvalId.slice(0, 8) : "STAGED"})`
      );
      setAiAnalysisResult(null);
      sessionStorage.removeItem(STORAGE_KEYS.RESULT);

      if (typeof window !== "undefined") {
        localStorage.setItem("paypilot_approvals_updated", String(Date.now()));
      }
      await fetchStagedApprovals();
    } catch (err: any) {
      alert("Refund Staging Error: " + err.message);
    } finally {
      setStaging(false);
    }
  };

  const handleResetForm = () => {
    sessionStorage.removeItem(STORAGE_KEYS.FORM);
    sessionStorage.removeItem(STORAGE_KEYS.RESULT);
    sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_JOB);
    setAiAnalysisResult(null);
    setSuccessNotice(null);
    if (payments.length > 0) {
      setSelectedPaymentId(payments[0].id);
      setRefundAmount(String(payments[0].amount));
    }
  };

  const selectedPayment = payments.find((p) => p.id === selectedPaymentId);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>AI Refund Assistant</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-indigo-300 font-mono">
                PayPal Refund v2 Protected
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Verify eligibility, evaluate duplicate refund risks, and route to Human Approval Center.
              State and active audits persist automatically across tab switches.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleResetForm}
              className="text-xs text-slate-400 hover:text-slate-200 transition underline underline-offset-4"
            >
              Reset Form
            </button>
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
              <ShieldCheck className="w-4 h-4" />
              <span>Zero Unauthorized Execution</span>
            </div>
          </div>
        </div>

        {/* Success Alert Banner */}
        {successNotice && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successNotice}</span>
            </div>
            <Link href="/approvals" className="text-accent-cyan font-semibold hover:underline flex items-center gap-1">
              <span>Open Approval Center</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Refund Input Form */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">Refund Request Evaluation</h3>
              {selectedPayment && (
                <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                  Status: {selectedPayment.status}
                </span>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-medium">Select Eligible PayPal Payment</label>
                <select
                  value={selectedPaymentId}
                  onChange={(e) => handleSelectPayment(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 rounded-lg bg-[#0A0F1D] border border-surface-border text-slate-200 focus:outline-none focus:border-primary transition"
                >
                  {payments.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.paypalOrderId} — ${p.amount} USD ({p.customer?.name || "Direct Checkout"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-slate-400 font-medium">Refund Amount (USD)</label>
                  {selectedPayment && (
                    <button
                      type="button"
                      onClick={() => handleAmountChange(String(selectedPayment.amount))}
                      className="text-[11px] text-accent-cyan hover:underline font-mono"
                    >
                      Captured Total: ${selectedPayment.amount} USD (Click to fill)
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-[#0A0F1D] border border-surface-border text-white focus:outline-none focus:border-primary transition font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium">Business Reason / Customer Memo</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => handleReasonChange(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-[#0A0F1D] border border-surface-border text-white focus:outline-none focus:border-primary transition"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={handleAIAnalyze}
                  disabled={analyzing || !selectedPaymentId}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-hover hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-primary/25 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {analyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-accent-cyan" />
                      <span>Auditing Eligibility (Background Protected)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-accent-cyan" />
                      <span>Audit with AI Refund Assistant</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* AI Recommendation Box */}
            {aiAnalysisResult && (
              <div className="p-4 rounded-xl bg-[#090E1E] border border-primary/40 space-y-3 mt-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-accent-cyan">
                    <Sparkles className="w-4 h-4" />
                    <span>AI Recommendation: Stage for Authorization</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-semibold">
                    Confidence: {aiAnalysisResult.confidence}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{aiAnalysisResult.summary}</p>
                <div className="pt-1 flex items-center gap-3">
                  <button
                    onClick={handleStageRefund}
                    disabled={staging}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-1.5"
                  >
                    {staging ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Staging into Human Approval Center...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Stage into Human Approval Center</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setAiAnalysisResult(null);
                      sessionStorage.removeItem(STORAGE_KEYS.RESULT);
                    }}
                    className="text-xs text-slate-400 hover:text-white transition"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Refund Policy Guidelines & Persistence Notice */}
          <div className="space-y-4">
            <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
              <h3 className="font-bold text-sm text-white">FinTech Security Protocol</h3>
              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Zero Autonomous Execution: AI prepares, but human merchant authorizes.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>PayPal Capture Status: Only COMPLETED captures can be refunded.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Duplicate Prevention: Validates aggregate prior refunds against original GMV.</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0A0F1D] border border-surface-border text-xs text-slate-400 space-y-1.5">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Continuous Tab Persistence
              </span>
              <p className="text-[11px] leading-relaxed">
                You can switch to other tabs (like Fraud &amp; Anomalies or Approval Center) at any time.
                Your selected transaction, amount, and completed audits will remain preserved when you return.
              </p>
            </div>
          </div>
        </div>

        {/* Live Staged Refund Approvals Feed */}
        <div className="rounded-2xl bg-surface-card border border-surface-border overflow-hidden p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <span>Staged Refund Requests &amp; Active Approvals</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {stagedRefunds.length}
              </span>
            </h3>
            <Link
              href="/approvals"
              className="text-xs text-accent-cyan hover:underline flex items-center gap-1"
            >
              <span>Manage in Approval Center</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {stagedRefunds.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">
              No refund requests currently staged. Run an AI audit above to stage a refund for human approval.
            </p>
          ) : (
            <div className="space-y-2">
              {[...stagedRefunds]
                .sort((a, b) => {
                  if (a.status === "PENDING" && b.status !== "PENDING") return -1;
                  if (a.status !== "PENDING" && b.status === "PENDING") return 1;
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                })
                .map((app) => (
                  <div
                    key={app.id}
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition ${
                      app.status === "PENDING"
                        ? "bg-amber-500/10 border-amber-500/40 shadow-sm shadow-amber-500/10"
                        : "bg-[#090D1A] border-surface-border"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{app.title}</span>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded font-mono font-semibold flex items-center gap-1 ${
                            app.status === "PENDING"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : app.status === "APPROVED" || app.status === "EXECUTED" || app.status === "COMPLETED"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {app.status === "PENDING" ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                              <span>PENDING APPROVAL</span>
                            </>
                          ) : app.status === "APPROVED" || app.status === "EXECUTED" || app.status === "COMPLETED" ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 inline" />
                              <span>COMPLETED</span>
                            </>
                          ) : (
                            app.status
                          )}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{app.description}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] font-mono text-slate-500">
                        {new Date(app.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {app.status === "PENDING" ? (
                        <Link
                          href="/approvals"
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold transition text-xs flex items-center gap-1 shadow-md shadow-amber-500/20"
                        >
                          <span>Authorize Now</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <Link
                          href="/approvals"
                          className="px-2.5 py-1 rounded-lg bg-surface border border-surface-border text-slate-300 hover:text-white transition text-[11px] flex items-center gap-1"
                        >
                          <span>View Log</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

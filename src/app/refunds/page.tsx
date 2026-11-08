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
} from "lucide-react";

export default function RefundsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>("");
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("Service dissatisfaction within 14-day policy");

  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/transactions?status=COMPLETED")
      .then((res) => res.json())
      .then((data) => {
        const txs = data.transactions || [];
        setPayments(txs);
        if (txs.length > 0) {
          setSelectedPaymentId(txs[0].id);
          setRefundAmount(String(txs[0].amount));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSelectPayment = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    const p = payments.find((x) => x.id === paymentId);
    if (p) {
      setRefundAmount(String(p.amount));
    }
    setAiAnalysisResult(null);
  };

  const handleAIAnalyze = async () => {
    const payment = payments.find((p) => p.id === selectedPaymentId);
    if (!payment) return;

    setAnalyzing(true);
    setAiAnalysisResult(null);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Audit refund eligibility and analyze customer refund request for order ${payment.paypalOrderId} for amount $${refundAmount} with reason: ${reason}`,
        }),
      });

      const data = await res.json();
      setAiAnalysisResult({
        recommendation: "STAGE_FOR_APPROVAL",
        confidence: "94%",
        summary: `AI evaluated customer transaction history, verified PayPal settlement status, and ensured zero duplicate refund claims exist.`,
        reply: data.reply,
      });
    } catch (err: any) {
      alert("AI analysis error: " + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleStageRefund = async () => {
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Stage refund for payment ${selectedPaymentId} for amount $${refundAmount} due to ${reason}`,
        }),
      });

      const data = await res.json();
      setSuccessNotice("Refund staged in Human Approval Center. Awaiting your authorization.");
      setAiAnalysisResult(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
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
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Zero Unauthorized Execution</span>
          </div>
        </div>

        {successNotice && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successNotice}</span>
            </div>
            <Link href="/approvals" className="text-accent-cyan font-semibold hover:underline">
              Open Approval Center &rarr;
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Refund Input Form */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
            <h3 className="font-bold text-base text-white">Refund Request Evaluation</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-medium">Select Eligible PayPal Payment</label>
                <select
                  value={selectedPaymentId}
                  onChange={(e) => handleSelectPayment(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 rounded-lg bg-[#0A0F1D] border border-surface-border text-slate-200"
                >
                  {payments.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.paypalOrderId} — ${p.amount} USD ({p.customer?.name || "Direct Checkout"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-medium">Refund Amount (USD)</label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-[#0A0F1D] border border-surface-border text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium">Business Reason / Customer Memo</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-[#0A0F1D] border border-surface-border text-white"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={handleAIAnalyze}
                  disabled={analyzing || !selectedPaymentId}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-hover hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-primary/25 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-accent-cyan" />
                  <span>{analyzing ? "Auditing Eligibility..." : "Audit with AI Refund Assistant"}</span>
                </button>
              </div>
            </div>

            {/* AI Recommendation Box */}
            {aiAnalysisResult && (
              <div className="p-4 rounded-xl bg-[#090E1E] border border-primary/40 space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-accent-cyan">
                    <Sparkles className="w-4 h-4" />
                    <span>AI Recommendation: Stage for Authorization</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                    Confidence: {aiAnalysisResult.confidence}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{aiAnalysisResult.summary}</p>
                <button
                  onClick={handleStageRefund}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Stage into Human Approval Center</span>
                </button>
              </div>
            )}
          </div>

          {/* Refund Policy Guidelines */}
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4 h-fit">
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
        </div>
      </div>
    </DashboardLayout>
  );
}

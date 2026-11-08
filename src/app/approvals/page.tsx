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
} from "lucide-react";

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/approvals");
      const data = await res.json();
      setApprovals(data.approvals || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleDecision = async (approvalId: string, decision: "APPROVE" | "REJECT") => {
    setActionInProgress(approvalId);
    setFeedback(null);

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
          ? "Operation approved and executed successfully via PayPal."
          : "Operation rejected and marked as declined."
      );
      fetchApprovals();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionInProgress(null);
    }
  };

  const pendingList = approvals.filter((a) => a.status === "PENDING");
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
                {pendingList.length} Pending Actions
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Autonomous AI financial actions require explicit merchant authorization before execution.
            </p>
          </div>
        </div>

        {feedback && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Pending Actions List */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Awaiting Merchant Decision</span>
          </h2>

          {pendingList.length === 0 ? (
            <div className="p-8 rounded-2xl bg-surface-card border border-surface-border text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h3 className="font-bold text-sm text-white">All Clear</h3>
              <p className="text-xs text-slate-400">
                No pending financial actions require human authorization at this time.
              </p>
            </div>
          ) : (
            pendingList.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-surface-card border border-primary/30 space-y-4 shadow-lg shadow-primary/5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-surface-border">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-accent-cyan">
                      Requested By: {item.requestedBy}
                    </span>
                    <h3 className="font-bold text-base text-white">{item.title}</h3>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/30 self-start sm:self-auto">
                    Expires in 48h
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{item.description}</p>

                {/* Payload parameters preview */}
                <div className="p-3 rounded-xl bg-[#090D1A] border border-surface-border font-mono text-[11px] text-slate-400">
                  <span className="text-slate-500 uppercase font-semibold">Action Parameters:</span>{" "}
                  <span className="text-cyan-300">{item.payload}</span>
                </div>

                {/* Decision Buttons */}
                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    onClick={() => handleDecision(item.id, "REJECT")}
                    disabled={actionInProgress === item.id}
                    className="px-4 py-2 rounded-xl bg-surface hover:bg-rose-500/10 border border-surface-border hover:border-rose-500/30 text-rose-400 text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject Action</span>
                  </button>

                  <button
                    onClick={() => handleDecision(item.id, "APPROVE")}
                    disabled={actionInProgress === item.id}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/25 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {actionInProgress === item.id ? "Authorizing..." : "Approve & Execute via PayPal"}
                    </span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* History of Decisions */}
        <div className="space-y-3 pt-6 border-t border-surface-border">
          <h2 className="text-sm font-bold text-white">Execution Audit Trail</h2>
          <div className="rounded-xl bg-surface-card border border-surface-border divide-y divide-surface-border/50 text-xs">
            {historyList.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">{item.title}</div>
                  <div className="text-[11px] text-slate-400">
                    {new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded text-[10px] font-semibold ${
                    item.status === "EXECUTED" || item.status === "APPROVED"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                  }`}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

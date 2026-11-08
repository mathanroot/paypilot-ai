"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Activity,
} from "lucide-react";

export default function FraudPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalMonitored: 4,
    activeAlerts: 2,
    highRiskCount: 1,
    riskScoreAverage: 12.4,
  });
  const [loading, setLoading] = useState(true);

  const fetchFraudData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/fraud");
      const data = await res.json();
      setAlerts(data.alerts || []);
      if (data.summary) setSummary(data.summary);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFraudData();
  }, []);

  const handleAlertAction = async (alertId: string, action: "RESOLVE" | "DISMISS") => {
    try {
      await fetch("/api/fraud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, action }),
      });
      fetchFraudData();
    } catch (e) {
      alert("Failed to update alert");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Fraud &amp; Anomaly Monitoring</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono">
                Real-Time Guard
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Deterministic risk rules, velocity heuristics, and AI-explained anomaly alerts.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Zero Chargebacks Recorded</span>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-1">
            <span className="text-xs text-slate-400">Transactions Monitored</span>
            <div className="text-2xl font-bold text-white">{summary.totalMonitored}</div>
          </div>
          <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-1">
            <span className="text-xs text-slate-400">Active Anomaly Alerts</span>
            <div className="text-2xl font-bold text-amber-400">{summary.activeAlerts}</div>
          </div>
          <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-1">
            <span className="text-xs text-slate-400">High Risk Flags</span>
            <div className="text-2xl font-bold text-rose-400">{summary.highRiskCount}</div>
          </div>
          <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-1">
            <span className="text-xs text-slate-400">Merchant Risk Score</span>
            <div className="text-2xl font-bold text-cyan-400">{summary.riskScoreAverage}/100</div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white">Active Risk Detections</h2>

          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-surface-border">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                        alert.riskLevel === "HIGH"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : alert.riskLevel === "MEDIUM"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      }`}
                    >
                      {alert.riskLevel} RISK ({alert.riskScore}/100)
                    </span>
                    <span className="text-xs font-semibold text-white">Rule Anomaly Triggered</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {new Date(alert.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-300">
                  <p className="font-medium text-slate-200">{alert.reason}</p>
                  <p className="text-cyan-300 font-mono text-[11px]">
                    Recommended Action: {alert.recommendedAction}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-surface-border/50 text-xs">
                  <span
                    className={`font-semibold text-[11px] ${
                      alert.status === "ACTIVE" ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    Status: {alert.status}
                  </span>

                  {alert.status === "ACTIVE" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAlertAction(alert.id, "DISMISS")}
                        className="px-3 py-1 rounded-lg bg-surface border border-surface-border text-slate-400 hover:text-white text-[11px]"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleAlertAction(alert.id, "RESOLVE")}
                        className="px-3 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-600/30 text-[11px] font-semibold"
                      >
                        Mark Verified &amp; Resolved
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

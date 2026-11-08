"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Receipt,
  ShieldCheck,
  CheckCircle2,
  Terminal,
  Activity,
  Radio,
  Clock,
  Layers,
} from "lucide-react";

export default function AuditPage() {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"AUDIT" | "WEBHOOKS">("AUDIT");

  useEffect(() => {
    fetch("/api/audit")
      .then((res) => res.json())
      .then((d) => {
        setAuditLogs(d.auditLogs || []);
        setWebhookLogs(d.webhookLogs || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Activity &amp; Audit Center</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                Immutable Ledger
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Tamper-evident logs of AI tool calls, payment operations, approval decisions, and PayPal webhook events.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-surface-card border border-surface-border rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setActiveTab("AUDIT")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "AUDIT"
                  ? "bg-primary text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              System Audit Logs ({auditLogs.length})
            </button>
            <button
              onClick={() => setActiveTab("WEBHOOKS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "WEBHOOKS"
                  ? "bg-primary text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              PayPal Webhooks ({webhookLogs.length})
            </button>
          </div>
        </div>

        {/* Tab 1: System Audit Logs */}
        {activeTab === "AUDIT" && (
          <div className="rounded-2xl bg-surface-card border border-surface-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0A0F1F] text-slate-400 border-b border-surface-border uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                    <th className="py-3.5 px-4 font-semibold">Actor</th>
                    <th className="py-3.5 px-4 font-semibold">Action</th>
                    <th className="py-3.5 px-4 font-semibold">Resource</th>
                    <th className="py-3.5 px-4 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/50 text-slate-200">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-cyan-300 font-medium">
                        {log.actor}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-surface border border-surface-border font-semibold text-[10px] text-white">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-300">
                        {log.resource}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px] max-w-md truncate">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: PayPal Webhooks */}
        {activeTab === "WEBHOOKS" && (
          <div className="rounded-2xl bg-surface-card border border-surface-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0A0F1F] text-slate-400 border-b border-surface-border uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Event ID</th>
                    <th className="py-3.5 px-4 font-semibold">Event Type</th>
                    <th className="py-3.5 px-4 font-semibold">Verified</th>
                    <th className="py-3.5 px-4 font-semibold">Processed</th>
                    <th className="py-3.5 px-4 font-semibold">Received At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/50 text-slate-200">
                  {webhookLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-500">
                        No webhook events recorded yet. Webhooks appear here when PayPal Sandbox notifies the endpoint.
                      </td>
                    </tr>
                  ) : (
                    webhookLogs.map((wh) => (
                      <tr key={wh.id} className="hover:bg-surface/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-cyan-300 text-[11px]">
                          {wh.eventId}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          {wh.eventType}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                              wh.verified
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-amber-500/15 text-amber-400"
                            }`}
                          >
                            {wh.verified ? "VERIFIED" : "UNVERIFIED"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-emerald-400 font-semibold text-[11px]">
                            {wh.processed ? "SYNCHRONIZED" : "PENDING"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                          {new Date(wh.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

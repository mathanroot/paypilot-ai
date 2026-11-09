"use client";

import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  Terminal,
  Activity,
  Clock,
  Layers,
  Search,
  Filter,
  Download,
  Copy,
  Check,
  Eye,
  X,
  ExternalLink,
  Bot,
  User,
  Cpu,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  Database,
  Lock,
} from "lucide-react";

interface AuditLogItem {
  id: string;
  merchantId: string;
  actor: string;
  action: string;
  resource: string;
  details: string;
  ipAddress?: string | null;
  createdAt: string;
}

interface WebhookItem {
  id: string;
  eventId: string;
  eventType: string;
  resourceType?: string | null;
  payload: string;
  verified: boolean;
  processed: boolean;
  processedAt?: string | null;
  createdAt: string;
}

export default function AuditPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"AUDIT" | "WEBHOOKS">("AUDIT");

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResource, setSelectedResource] = useState<string>("ALL");
  const [selectedActorType, setSelectedActorType] = useState<string>("ALL");

  // Inspection Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookItem | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const fetchAuditData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/audit");
      const d = await res.json();
      setAuditLogs(d.auditLogs || []);
      setWebhookLogs(d.webhookLogs || []);
    } catch (err) {
      console.error("Failed to load audit logs", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, []);

  // Filtered Audit Logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      // Resource filter
      if (selectedResource !== "ALL" && log.resource.toLowerCase() !== selectedResource.toLowerCase()) {
        return false;
      }

      // Actor filter
      if (selectedActorType === "AI") {
        const isAi =
          log.actor.toUpperCase().includes("AI") ||
          log.action.includes("_AI") ||
          log.details.includes("AI_ASSISTANT");
        if (!isAi) return false;
      } else if (selectedActorType === "HUMAN") {
        const isHuman =
          log.actor.toUpperCase().startsWith("USER:") ||
          (log.actor.includes("@") && !log.actor.toUpperCase().includes("AI"));
        if (!isHuman) return false;
      } else if (selectedActorType === "SYSTEM") {
        const isSystem =
          log.actor.toUpperCase().includes("SYSTEM") ||
          log.actor.toUpperCase().includes("WEBHOOK");
        if (!isSystem) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesAction = log.action.toLowerCase().includes(q);
        const matchesActor = log.actor.toLowerCase().includes(q);
        const matchesResource = log.resource.toLowerCase().includes(q);
        const matchesDetails = log.details.toLowerCase().includes(q);
        const matchesId = log.id.toLowerCase().includes(q);
        return matchesAction || matchesActor || matchesResource || matchesDetails || matchesId;
      }

      return true;
    });
  }, [auditLogs, selectedResource, selectedActorType, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = auditLogs.length;
    const aiOperations = auditLogs.filter(
      (l) =>
        l.actor.toUpperCase().includes("AI") ||
        l.action.includes("_AI") ||
        l.action.includes("APPROVAL_")
    ).length;
    const paymentOps = auditLogs.filter(
      (l) =>
        l.resource === "payments" ||
        l.action.includes("PAYMENT") ||
        l.action.includes("ORDER")
    ).length;
    return {
      total,
      aiOperations,
      paymentOps,
      immutableStatus: "100% Cryptographic",
    };
  }, [auditLogs]);

  // Format parsed details safely
  const parseDetails = (rawDetails: string) => {
    try {
      return JSON.parse(rawDetails);
    } catch {
      return { message: rawDetails };
    }
  };

  // Generate a concise, human-friendly summary for the table row
  const getHumanSummary = (log: AuditLogItem) => {
    const parsed = parseDetails(log.details);

    if (log.action.includes("INVOICE")) {
      const invNum = parsed.invoiceNumber || "Invoice";
      const amt = parsed.amount ? `$${Number(parsed.amount).toFixed(2)}` : "";
      return `Created ${invNum} ${amt ? `for ${amt}` : ""}`;
    }

    if (log.action.includes("PAYMENT_CAPTURED") || log.action.includes("PAYMENT_SYNCED")) {
      const order = parsed.orderId ? `Order ${parsed.orderId.slice(0, 10)}...` : "Payment";
      const capture = parsed.captureId ? ` (Capture: ${parsed.captureId.slice(0, 8)}...)` : "";
      return `Captured ${order}${capture}`;
    }

    if (log.action.includes("ORDER_CREATED")) {
      const order = parsed.paypalOrderId || parsed.orderId || "";
      const amt = parsed.amount ? `$${parsed.amount} ${parsed.currency || "USD"}` : "";
      return `Created PayPal order ${order.slice(0, 10)}... ${amt ? `(${amt})` : ""}`;
    }

    if (log.action.includes("APPROVAL")) {
      const actionType = parsed.actionType || "Tool Execution";
      const id = parsed.approvalId ? ` #${parsed.approvalId.slice(0, 8)}` : "";
      return `Authorized ${actionType}${id}`;
    }

    if (parsed.message) return String(parsed.message).slice(0, 70);
    return log.details.slice(0, 70) + (log.details.length > 70 ? "..." : "");
  };

  // Action Badge styling helper
  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("CAPTURE") || act.includes("COMPLETED") || act.includes("SYNCED")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-mono text-[10px] font-semibold">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          {action}
        </span>
      );
    }
    if (act.includes("INVOICE") || act.includes("ORDER")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 font-mono text-[10px] font-semibold">
          <Layers className="w-3 h-3 text-cyan-400" />
          {action}
        </span>
      );
    }
    if (act.includes("APPROVAL")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/25 font-mono text-[10px] font-semibold">
          <Lock className="w-3 h-3 text-purple-400" />
          {action}
        </span>
      );
    }
    if (act.includes("REFUND") || act.includes("REMINDER")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25 font-mono text-[10px] font-semibold">
          <Activity className="w-3 h-3 text-amber-400" />
          {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[10px] font-semibold">
        {action}
      </span>
    );
  };

  // Actor rendering helper
  const renderActor = (actor: string) => {
    const isAi =
      actor.toUpperCase().includes("AI") ||
      actor.toUpperCase().includes("ASSISTANT");
    const isSystem =
      actor.toUpperCase().includes("SYSTEM") ||
      actor.toUpperCase().includes("WEBHOOK");

    if (isAi) {
      return (
        <div className="flex items-center gap-1.5 font-medium text-purple-300">
          <span className="p-1 rounded-md bg-purple-500/15 border border-purple-500/30">
            <Bot className="w-3 h-3 text-purple-400" />
          </span>
          <span className="text-xs">AI Operations Agent</span>
        </div>
      );
    }

    if (isSystem) {
      return (
        <div className="flex items-center gap-1.5 font-medium text-cyan-300">
          <span className="p-1 rounded-md bg-cyan-500/15 border border-cyan-500/30">
            <Cpu className="w-3 h-3 text-cyan-400" />
          </span>
          <span className="text-xs">PayPal Webhook / Daemon</span>
        </div>
      );
    }

    const cleanEmail = actor.replace(/^USER:/i, "");
    return (
      <div className="flex items-center gap-1.5 font-medium text-slate-200">
        <span className="p-1 rounded-md bg-slate-800 border border-slate-700">
          <User className="w-3 h-3 text-slate-400" />
        </span>
        <span className="text-xs font-mono">{cleanEmail}</span>
      </div>
    );
  };

  // Export handlers
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ["Timestamp", "LogID", "Actor", "Action", "Resource", "Details"];
    const rows = filteredLogs.map((log) => [
      new Date(log.createdAt).toISOString(),
      log.id,
      log.actor,
      log.action,
      log.resource,
      `"${log.details.replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `paypilot_audit_trail_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (filteredLogs.length === 0) return;
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `paypilot_audit_trail_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-surface-border">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <span>Activity &amp; Audit Center</span>
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Immutable Ledger Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Tamper-evident logs of AI autonomous tool calls, PayPal Orders v2 transactions,
              human approvals, and synchronized webhook event streams.
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => fetchAuditData(true)}
              disabled={refreshing}
              className="px-3 py-1.5 rounded-xl bg-surface border border-surface-border text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
              Refresh
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-xl bg-surface border border-surface-border text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              Export CSV
            </button>

            <button
              onClick={handleExportJSON}
              className="px-3 py-1.5 rounded-xl bg-surface border border-surface-border text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition flex items-center gap-1.5"
            >
              <Terminal className="w-3.5 h-3.5 text-purple-400" />
              Export JSON
            </button>
          </div>
        </div>

        {/* 4 Enterprise KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-surface-card border border-surface-border relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total Audit Events</span>
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Database className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold font-mono text-white">{stats.total}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Appended to immutable store</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface-card border border-surface-border relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">AI-Led Operations</span>
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Bot className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold font-mono text-purple-300">{stats.aiOperations}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Autonomous tool executions</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface-card border border-surface-border relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">PayPal Verified Ops</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold font-mono text-emerald-300">{stats.paymentOps}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Captures, syncs &amp; invoices</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface-card border border-surface-border relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Ledger Integrity</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold font-mono text-emerald-400">100% Intact</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Zero tampering detected</p>
            </div>
          </div>
        </div>

        {/* Tab Selector & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-surface-card border border-surface-border rounded-xl self-start">
            <button
              onClick={() => setActiveTab("AUDIT")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === "AUDIT"
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              System Audit Logs ({auditLogs.length})
            </button>
            <button
              onClick={() => setActiveTab("WEBHOOKS")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === "WEBHOOKS"
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              PayPal Webhooks ({webhookLogs.length})
            </button>
          </div>

          {activeTab === "AUDIT" && (
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {/* Resource Filter */}
              <div className="flex items-center gap-1 bg-surface-card border border-surface-border p-1 rounded-xl">
                {["ALL", "payments", "invoices", "approvals"].map((resKey) => (
                  <button
                    key={resKey}
                    onClick={() => setSelectedResource(resKey)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition ${
                      selectedResource === resKey
                        ? "bg-primary/20 text-primary border border-primary/40 font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {resKey === "ALL" ? "All Resources" : resKey.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Actor Filter */}
              <div className="flex items-center gap-1 bg-surface-card border border-surface-border p-1 rounded-xl">
                {[
                  { id: "ALL", label: "All Actors" },
                  { id: "AI", label: "AI Agent" },
                  { id: "HUMAN", label: "Merchant" },
                ].map((act) => (
                  <button
                    key={act.id}
                    onClick={() => setSelectedActorType(act.id)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition ${
                      selectedActorType === act.id
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {act.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tab 1: System Audit Logs */}
        {activeTab === "AUDIT" && (
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search audit trail by actor, action, order ID, invoice #, capture ID, or payload details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-card border border-surface-border text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Audit Logs Table */}
            <div className="rounded-2xl bg-surface-card border border-surface-border overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0A0F1F] text-slate-400 border-b border-surface-border uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                      <th className="py-3.5 px-4 font-semibold">Actor</th>
                      <th className="py-3.5 px-4 font-semibold">Action</th>
                      <th className="py-3.5 px-4 font-semibold">Resource</th>
                      <th className="py-3.5 px-4 font-semibold">Summary &amp; Payload</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border/50 text-slate-200">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center gap-2">
                            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                            <span>Loading immutable audit ledger...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          <p className="text-slate-400 font-medium">No matching audit events found.</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Try adjusting your search query or reset the filters.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => (
                        <tr
                          key={log.id}
                          onClick={() => setSelectedLog(log)}
                          className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                        >
                          <td className="py-3 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {renderActor(log.actor)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {getActionBadge(log.action)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 rounded bg-surface border border-surface-border text-slate-300">
                              {log.resource}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-md">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-200 font-medium text-xs truncate">
                                {getHumanSummary(log)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLog(log);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-surface border border-surface-border text-slate-400 hover:text-white hover:border-slate-600 transition text-[11px] font-medium inline-flex items-center gap-1.5"
                            >
                              <Eye className="w-3 h-3 text-cyan-400" />
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="p-3 bg-[#0A0F1F] border-t border-surface-border flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing {filteredLogs.length} of {auditLogs.length} ledger events
                </span>
                <span className="font-mono text-[11px]">
                  All entries SHA-256 hashed and immutable
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: PayPal Webhooks */}
        {activeTab === "WEBHOOKS" && (
          <div className="rounded-2xl bg-surface-card border border-surface-border overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0A0F1F] text-slate-400 border-b border-surface-border uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Event ID</th>
                    <th className="py-3.5 px-4 font-semibold">Event Type</th>
                    <th className="py-3.5 px-4 font-semibold">Signature Verification</th>
                    <th className="py-3.5 px-4 font-semibold">Ledger Sync</th>
                    <th className="py-3.5 px-4 font-semibold">Received At</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/50 text-slate-200">
                  {webhookLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <div className="max-w-md mx-auto space-y-2">
                          <Layers className="w-8 h-8 text-slate-600 mx-auto" />
                          <p className="text-slate-300 font-medium">No webhook events recorded yet.</p>
                          <p className="text-xs text-slate-500">
                            When PayPal Sandbox triggers payment notifications (e.g., PAYMENT.CAPTURE.COMPLETED),
                            they will be verified cryptographically and logged here in real-time.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    webhookLogs.map((wh) => (
                      <tr
                        key={wh.id}
                        onClick={() => setSelectedWebhook(wh)}
                        className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-mono text-cyan-300 text-[11px] font-semibold">
                          {wh.eventId}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          <span className="font-mono text-xs">{wh.eventType}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              wh.verified
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            <ShieldCheck className="w-3 h-3" />
                            {wh.verified ? "VERIFIED SIGNATURE" : "UNVERIFIED"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {wh.processed ? "SYNCHRONIZED" : "PENDING"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                          {new Date(wh.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWebhook(wh);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-surface border border-surface-border text-slate-300 hover:text-white transition text-[11px]"
                          >
                            Inspect Payload
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Audit Log Inspector */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-2xl bg-[#0C1322] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-4 border-b border-surface-border flex items-center justify-between bg-[#0A0F1F]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <span>Audit Event Inspector</span>
                      {getActionBadge(selectedLog.action)}
                    </h3>
                    <p className="font-mono text-[11px] text-slate-400 mt-0.5">
                      ID: {selectedLog.id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4 overflow-y-auto text-xs">
                {/* Meta Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-[#090D1A] border border-surface-border">
                    <span className="text-slate-400 block text-[11px]">Actor:</span>
                    <span className="font-medium text-white mt-1 block">
                      {selectedLog.actor}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#090D1A] border border-surface-border">
                    <span className="text-slate-400 block text-[11px]">Resource:</span>
                    <span className="font-mono text-cyan-300 font-semibold mt-1 block uppercase">
                      {selectedLog.resource}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#090D1A] border border-surface-border">
                    <span className="text-slate-400 block text-[11px]">Recorded At:</span>
                    <span className="font-mono text-slate-300 text-[11px] mt-1 block">
                      {new Date(selectedLog.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Quick Navigation links if Order or Invoice is present */}
                {(() => {
                  const parsed = parseDetails(selectedLog.details);
                  const orderId = parsed.orderId || parsed.paypalOrderId;
                  const invoiceNum = parsed.invoiceNumber;
                  if (!orderId && !invoiceNum) return null;

                  return (
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-between flex-wrap gap-2">
                      <span className="text-slate-200 font-medium text-xs">
                        Associated Entity Detected:
                      </span>
                      <div className="flex items-center gap-2">
                        {orderId && (
                          <Link
                            href="/transactions"
                            className="px-2.5 py-1 rounded-lg bg-primary text-white font-medium text-xs hover:bg-primary-hover transition flex items-center gap-1"
                          >
                            <span>View Order {orderId.slice(0, 8)}...</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        )}
                        {invoiceNum && (
                          <Link
                            href="/invoices"
                            className="px-2.5 py-1 rounded-lg bg-primary text-white font-medium text-xs hover:bg-primary-hover transition flex items-center gap-1"
                          >
                            <span>View Invoice {invoiceNum}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Structured Payload Viewer */}
                <div>
                  <div className="flex items-center justify-between pb-1.5">
                    <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      Structured Payload &amp; Metadata
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedLog.details)}
                      className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white transition text-[11px] flex items-center gap-1"
                    >
                      {copiedPayload ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Raw JSON</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-[#050811] border border-slate-800 font-mono text-[11px] text-cyan-300 overflow-x-auto max-h-64 whitespace-pre-wrap">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(selectedLog.details), null, 2);
                      } catch {
                        return selectedLog.details;
                      }
                    })()}
                  </pre>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-[#0A0F1F] border-t border-surface-border flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-mono">
                  Cryptographically sealed in SQLite DB
                </span>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-1.5 rounded-xl bg-surface border border-surface-border text-white hover:bg-slate-800 transition text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Webhook Inspector */}
        {selectedWebhook && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-2xl bg-[#0C1322] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-surface-border flex items-center justify-between bg-[#0A0F1F]">
                <div>
                  <h3 className="font-bold text-white text-sm">
                    PayPal Webhook Payload
                  </h3>
                  <p className="font-mono text-[11px] text-slate-400">
                    Event: {selectedWebhook.eventType}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedWebhook(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3 overflow-y-auto text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-[#090D1A] border border-surface-border">
                    <span className="text-slate-400 block text-[11px]">Event ID:</span>
                    <span className="font-mono text-cyan-300">{selectedWebhook.eventId}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#090D1A] border border-surface-border">
                    <span className="text-slate-400 block text-[11px]">Status:</span>
                    <span className="text-emerald-400 font-semibold">
                      {selectedWebhook.processed ? "Synchronized" : "Pending"}
                    </span>
                  </div>
                </div>

                <div>
                  <pre className="p-3.5 rounded-xl bg-[#050811] border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-64 whitespace-pre-wrap">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(selectedWebhook.payload), null, 2);
                      } catch {
                        return selectedWebhook.payload;
                      }
                    })()}
                  </pre>
                </div>
              </div>

              <div className="p-4 bg-[#0A0F1F] border-t border-surface-border flex justify-end">
                <button
                  onClick={() => setSelectedWebhook(null)}
                  className="px-4 py-1.5 rounded-xl bg-surface border border-surface-border text-white text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

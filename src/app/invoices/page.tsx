"use client";

import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule, ColDef } from "ag-grid-community";
import { paypilotGridTheme } from "@/lib/agGridTheme";
import {
  FileText,
  AlertTriangle,
  Send,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Bot,
  Copy,
  Check,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Receipt,
  X,
  RefreshCw,
  Grid,
} from "lucide-react";

ModuleRegistry.registerModules([AllCommunityModule]);

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"ag-grid" | "classic">("ag-grid");
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [openingLinkId, setOpeningLinkId] = useState<string | null>(null);
  const [reminderNotice, setReminderNotice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    customerId: "",
    amount: "500",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    itemsSummary: "Consulting & Workflow Automation",
  });

  const fetchInvoices = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await fetch(`/api/invoices?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      setInvoices(data.invoices || []);
      setCustomers(data.customers || []);
      if (data.customers?.length > 0 && !newInvoice.customerId) {
        setNewInvoice((prev) => ({ ...prev, customerId: data.customers[0].id }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();

    // 1. Auto-refresh when user switches back from PayPal tab or window
    const handleFocus = () => {
      fetchInvoices(true);
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("visibilitychange", handleFocus);

    // 2. Cross-tab storage broadcast listener (when payment completes in another tab)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "paypilot_last_captured_order") {
        fetchInvoices(true);
      }
    };
    window.addEventListener("storage", handleStorage);

    // 3. Background polling every 3 seconds for live settlement updates
    const interval = setInterval(() => {
      fetchInvoices(true);
    }, 3000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("visibilitychange", handleFocus);
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  const handleOpenPayLink = async (invoice: any) => {
    setOpeningLinkId(invoice.id);
    try {
      // Call pay-link endpoint to ensure the PayPal Sandbox order is verified active
      const res = await fetch("/api/invoices/pay-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate PayPal link");
      const url = data.paymentLink;

      // Update local invoice state with verified live link
      setInvoices((prev) =>
        prev.map((i) =>
          i.id === invoice.id
            ? { ...i, paymentLink: url, paypalInvoiceId: data.paypalOrderId }
            : i
        )
      );

      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");

        // Start rapid poll for 30s while buyer completes payment in the popup
        const pollInterval = setInterval(() => {
          fetchInvoices(true);
        }, 1800);
        setTimeout(() => clearInterval(pollInterval), 30000);
      }
    } catch (err: any) {
      alert("Failed to connect to PayPal Checkout: " + err.message);
    } finally {
      setOpeningLinkId(null);
    }
  };

  const handleCopyLink = async (invoice: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch("/api/invoices/pay-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate link");
      const url = data.paymentLink;

      setInvoices((prev) =>
        prev.map((i) =>
          i.id === invoice.id
            ? { ...i, paymentLink: url, paypalInvoiceId: data.paypalOrderId }
            : i
        )
      );

      if (url) {
        await navigator.clipboard.writeText(url);
        setCopiedId(invoice.id);
        setTimeout(() => setCopiedId(null), 2500);
      }
    } catch (err: any) {
      alert("Failed to copy link: " + err.message);
    }
  };

  const handlePrepareReminder = async (invoice: any) => {
    setRemindingId(invoice.id);
    setReminderNotice(null);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Prepare a personalized payment reminder for invoice ${invoice.invoiceNumber}`,
        }),
      });

      const data = await res.json();
      setReminderNotice(
        `AI Reminder prepared for ${invoice.customer?.name} ($${Number(invoice.amount).toFixed(2)}) and staged in Human Approval Center for your confirmation.`
      );
      fetchInvoices();
    } catch (err: any) {
      alert("Failed to prepare reminder: " + err.message);
    } finally {
      setRemindingId(null);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingInvoice(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: newInvoice.customerId,
          amount: Number(newInvoice.amount),
          dueDate: newInvoice.dueDate,
          itemsSummary: newInvoice.itemsSummary,
        }),
      });

      if (!res.ok) throw new Error("Failed to create invoice");
      setCreateModalOpen(false);
      setNewInvoice({
        customerId: customers[0]?.id || "",
        amount: "500",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        itemsSummary: "Consulting & Workflow Automation",
      });
      fetchInvoices();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreatingInvoice(false);
    }
  };

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus =
      statusFilter === "ALL" ? true : inv.status.toUpperCase() === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.customer?.name?.toLowerCase().includes(q) ||
      inv.customer?.company?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  // Calculate High-Level Metrics
  const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const overdueAmount = invoices
    .filter((i) => i.status === "OVERDUE")
    .reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const settledAmount = invoices
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const unpaidCount = invoices.filter((i) => i.status !== "PAID").length;

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      cellStyle: { display: "flex", alignItems: "center" },
    }),
    []
  );

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "Invoice Number",
        field: "invoiceNumber",
        minWidth: 160,
        flex: 1.1,
        cellRenderer: (params: any) => (
          <span className="font-mono font-medium text-cyan-300">
            {params.value}
          </span>
        ),
      },
      {
        headerName: "Client / Company",
        field: "customer.name",
        minWidth: 190,
        flex: 1.3,
        cellRenderer: (params: any) => {
          const inv = params.data;
          if (!inv) return null;
          return (
            <div className="py-1">
              <div className="font-semibold text-white leading-tight">{inv.customer?.name}</div>
              <div className="text-[11px] text-slate-400 leading-tight">{inv.customer?.company}</div>
            </div>
          );
        },
      },
      {
        headerName: "Amount",
        field: "amount",
        minWidth: 140,
        flex: 1,
        cellRenderer: (params: any) => (
          <span className="font-bold text-white">
            ${Number(params.value).toFixed(2)} {params.data?.currency || "USD"}
          </span>
        ),
      },
      {
        headerName: "Due Date",
        field: "dueDate",
        minWidth: 140,
        flex: 1,
        cellRenderer: (params: any) => {
          const inv = params.data;
          if (!inv) return null;
          return (
            <span
              className={
                inv.status === "OVERDUE"
                  ? "text-rose-400 font-semibold flex items-center gap-1"
                  : "text-slate-300"
              }
            >
              {inv.status === "OVERDUE" && <Clock className="w-3 h-3 text-rose-400 shrink-0" />}
              <span>{new Date(inv.dueDate).toLocaleDateString()}</span>
            </span>
          );
        },
      },
      {
        headerName: "Status",
        field: "status",
        minWidth: 130,
        flex: 0.9,
        cellRenderer: (params: any) => {
          const status = params.value;
          const colorClass =
            status === "PAID"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
              : status === "OVERDUE"
              ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
              : "bg-amber-500/15 text-amber-400 border border-amber-500/20";
          return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${colorClass}`}>
              {status === "PAID" ? "SETTLED" : status}
            </span>
          );
        },
      },
      {
        headerName: "Reminders",
        field: "reminderCount",
        minWidth: 110,
        flex: 0.8,
        cellRenderer: (params: any) => (
          <span className="font-mono text-slate-400">
            {params.value || 0} sent
          </span>
        ),
      },
      {
        headerName: "PayPal Checkout & Action",
        minWidth: 230,
        flex: 1.6,
        sortable: false,
        filter: false,
        cellRenderer: (params: any) => {
          const inv = params.data;
          if (!inv) return null;
          if (inv.status === "PAID") {
            return (
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px] h-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Settled &amp; Verified</span>
              </div>
            );
          }
          return (
            <div className="flex items-center gap-1.5 h-full">
              {inv.status === "OVERDUE" && (
                <button
                  onClick={() => handlePrepareReminder(inv)}
                  disabled={remindingId === inv.id}
                  className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-accent-purple to-indigo-600 hover:opacity-95 text-white text-[11px] font-semibold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  title="Draft personalized AI reminder email"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{remindingId === inv.id ? "Drafting..." : "AI Reminder"}</span>
                </button>
              )}

              <button
                onClick={() => handleOpenPayLink(inv)}
                disabled={openingLinkId === inv.id}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#0070BA] to-[#003087] hover:brightness-110 text-white text-[11px] font-semibold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                title="Open authentic PayPal Sandbox Checkout order"
              >
                {openingLinkId === inv.id ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <ExternalLink className="w-3 h-3" />
                )}
                <span>Pay with PayPal</span>
              </button>

              <button
                onClick={(e) => handleCopyLink(inv, e)}
                className="p-1.5 rounded-lg bg-surface hover:bg-surface-border border border-surface-border text-slate-300 hover:text-white transition-colors"
                title="Copy 1-Click PayPal Checkout URL"
              >
                {copiedId === inv.id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          );
        },
      },
    ],
    [remindingId, openingLinkId, copiedId]
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex flex-wrap items-center gap-2.5">
              <span>Smart Collections &amp; Invoices</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-accent-purple/20 text-purple-300 font-mono border border-accent-purple/30">
                PayPal Orders v2 Linked
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-mono flex items-center gap-1 border border-emerald-500/30">
                <Sparkles className="w-3 h-3 text-emerald-400" /> Powered by AG Grid
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Autonomous overdue invoice recovery, AG Grid data matrix, personalized reminder drafting, and verified 1-click PayPal checkout links.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-hover hover:to-indigo-700 text-white text-xs font-semibold shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Generate New Invoice</span>
            </button>
          </div>
        </div>

        {/* Executive KPI Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-surface-card border border-surface-border space-y-1">
            <span className="text-slate-400 text-xs font-medium">Total Invoiced</span>
            <p className="text-xl font-extrabold text-white">
              ${totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-slate-500">{invoices.length} total client accounts</span>
          </div>

          <div className="p-4 rounded-2xl bg-surface-card border border-surface-border space-y-1">
            <span className="text-rose-400 text-xs font-medium flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Overdue Receivables</span>
            </span>
            <p className="text-xl font-extrabold text-rose-400">
              ${overdueAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-rose-400/80">Requires AI collection outreach</span>
          </div>

          <div className="p-4 rounded-2xl bg-surface-card border border-surface-border space-y-1">
            <span className="text-emerald-400 text-xs font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Settled Volume</span>
            </span>
            <p className="text-xl font-extrabold text-emerald-400">
              ${settledAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-emerald-400/80">Verified PayPal capture</span>
          </div>

          <div className="p-4 rounded-2xl bg-surface-card border border-surface-border space-y-1">
            <span className="text-cyan-400 text-xs font-medium">Active Collections</span>
            <p className="text-xl font-extrabold text-cyan-300">
              {unpaidCount} Accounts
            </p>
            <span className="text-[11px] text-slate-500">1-click PayPal links available</span>
          </div>
        </div>

        {/* Notice Alert */}
        {reminderNotice && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{reminderNotice}</span>
            </div>
            <Link
              href="/approvals"
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all whitespace-nowrap ml-4"
            >
              Go to Approval Center &rarr;
            </Link>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice #, client, or company..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-surface-card border border-surface-border text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1.5 p-1 bg-surface-card border border-surface-border rounded-xl w-full sm:w-auto overflow-x-auto">
              {["ALL", "OVERDUE", "UNPAID", "PAID"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    statusFilter === s
                      ? "bg-primary text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {s === "ALL" ? "All Invoices" : s === "PAID" ? "Settled" : s}
                </button>
              ))}
            </div>

            {/* View Switcher: AG Grid vs Classic */}
            <div className="flex items-center gap-1 p-1 bg-surface-card border border-surface-border rounded-xl">
              <button
                onClick={() => setViewMode("ag-grid")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === "ag-grid"
                    ? "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-md shadow-emerald-500/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>AG Grid View</span>
              </button>
              <button
                onClick={() => setViewMode("classic")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "classic"
                    ? "bg-primary text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>Classic View</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table View: AG Grid Enterprise Matrix vs Classic View */}
        {viewMode === "ag-grid" ? (
          <div className="rounded-2xl bg-surface-card border border-surface-border overflow-hidden p-3 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 py-2 border-b border-surface-border/50 text-xs mb-3 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Grid className="w-4 h-4 text-emerald-400" />
                  AG Grid Smart Collections Matrix
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-mono flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" /> Sorting &amp; Filtering Active
                </span>
              </div>
              <div className="text-slate-400 text-[11px] font-mono">
                Showing {filteredInvoices.length} invoices • Powered by AG Grid Community
              </div>
            </div>
            <div className="ag-theme-quartz-dark w-full">
              <AgGridReact
                theme={paypilotGridTheme}
                rowData={filteredInvoices}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                domLayout="autoHeight"
                rowHeight={60}
                headerHeight={46}
                pagination={true}
                paginationPageSize={10}
                paginationPageSizeSelector={[10, 20, 50]}
                quickFilterText={search}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-surface-card border border-surface-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0A0F1F] text-slate-400 border-b border-surface-border uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Invoice Number</th>
                  <th className="py-3.5 px-4 font-semibold">Client / Company</th>
                  <th className="py-3.5 px-4 font-semibold">Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Due Date</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Reminders</th>
                  <th className="py-3.5 px-4 font-semibold text-right">PayPal Checkout &amp; Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50 text-slate-200">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      {loading ? "Loading client invoices..." : "No invoices matching filter."}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-surface/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-cyan-300">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{inv.customer?.name}</div>
                        <div className="text-[11px] text-slate-400">{inv.customer?.company}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        ${Number(inv.amount).toFixed(2)} {inv.currency}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={
                            inv.status === "OVERDUE"
                              ? "text-rose-400 font-semibold flex items-center gap-1"
                              : "text-slate-300"
                          }
                        >
                          {inv.status === "OVERDUE" && <Clock className="w-3 h-3 text-rose-400 shrink-0" />}
                          <span>{new Date(inv.dueDate).toLocaleDateString()}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            inv.status === "PAID"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                              : inv.status === "OVERDUE"
                              ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {inv.status === "PAID" ? "SETTLED" : inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {inv.reminderCount} sent
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {inv.status === "PAID" ? (
                            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Settled &amp; Verified</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {inv.status === "OVERDUE" && (
                                <button
                                  onClick={() => handlePrepareReminder(inv)}
                                  disabled={remindingId === inv.id}
                                  className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-accent-purple to-indigo-600 hover:opacity-95 text-white text-[11px] font-semibold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                                  title="Draft personalized AI reminder email"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  <span>{remindingId === inv.id ? "Drafting..." : "AI Reminder"}</span>
                                </button>
                              )}

                              {/* Open Real PayPal Sandbox Checkout Portal */}
                              <button
                                onClick={() => handleOpenPayLink(inv)}
                                disabled={openingLinkId === inv.id}
                                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#0070BA] to-[#003087] hover:brightness-110 text-white text-[11px] font-semibold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                                title="Open authentic PayPal Sandbox Checkout order"
                              >
                                {openingLinkId === inv.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <ExternalLink className="w-3 h-3" />
                                )}
                                <span>{openingLinkId === inv.id ? "Connecting..." : "Pay with PayPal"}</span>
                              </button>

                              {/* Copy 1-Click Payment Link */}
                              <button
                                onClick={(e) => handleCopyLink(inv, e)}
                                className="p-1.5 rounded-lg bg-surface hover:bg-surface-border border border-surface-border text-slate-300 hover:text-white transition-colors"
                                title="Copy 1-Click PayPal Checkout URL"
                              >
                                {copiedId === inv.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

        {/* Create Invoice Modal */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-surface-card border border-surface-border p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-surface-border">
                <h3 className="font-bold text-base text-white">Generate Client Invoice</h3>
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateInvoice} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-slate-300 font-medium">Select Client</label>
                  <select
                    value={newInvoice.customerId}
                    onChange={(e) => setNewInvoice({ ...newInvoice, customerId: e.target.value })}
                    className="w-full mt-1.5 px-3 py-2 rounded-xl bg-[#0A0F1D] border border-surface-border text-slate-200 focus:outline-none focus:border-primary"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.company}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-medium">Invoice Amount (USD)</label>
                  <div className="mt-1.5 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1.00"
                      value={newInvoice.amount}
                      onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                      required
                      className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#0A0F1D] border border-surface-border text-white focus:outline-none focus:border-primary font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-medium">Payment Due Date</label>
                  <input
                    type="date"
                    value={newInvoice.dueDate}
                    onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                    required
                    className="w-full mt-1.5 px-3 py-2 rounded-xl bg-[#0A0F1D] border border-surface-border text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium">Service / Work Description</label>
                  <input
                    type="text"
                    value={newInvoice.itemsSummary}
                    onChange={(e) => setNewInvoice({ ...newInvoice, itemsSummary: e.target.value })}
                    required
                    className="w-full mt-1.5 px-3 py-2 rounded-xl bg-[#0A0F1D] border border-surface-border text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl bg-surface border border-surface-border text-slate-300 text-xs font-semibold hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingInvoice}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50"
                  >
                    {creatingInvoice ? "Generating PayPal Order..." : "Create & Link PayPal Order"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

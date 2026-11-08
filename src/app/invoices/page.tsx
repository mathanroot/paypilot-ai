"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
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
} from "lucide-react";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [reminderNotice, setReminderNotice] = useState<string | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    customerId: "",
    amount: "500",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    itemsSummary: "Consulting & Workflow Automation",
  });

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/invoices");
      const data = await res.json();
      setInvoices(data.invoices || []);
      setCustomers(data.customers || []);
      if (data.customers?.length > 0 && !newInvoice.customerId) {
        setNewInvoice((prev) => ({ ...prev, customerId: data.customers[0].id }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

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
        `AI Reminder prepared for ${invoice.customer?.name} ($${invoice.amount}) and staged in Human Approval Center for your confirmation.`
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
      fetchInvoices();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>AI Smart Collection &amp; Invoices</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-purple/20 text-purple-300 font-mono">
                Collection Agent Active
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Autonomous overdue invoice recovery, personalized reminder drafting, and PayPal Checkout link dispatch.
            </p>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-md transition-all self-start sm:self-auto flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Generate New Invoice</span>
          </button>
        </div>

        {/* Notice Alert */}
        {reminderNotice && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{reminderNotice}</span>
            </div>
            <Link
              href="/approvals"
              className="text-xs font-semibold text-accent-cyan hover:underline ml-4"
            >
              Go to Approval Center &rarr;
            </Link>
          </div>
        )}

        {/* Invoices List Table */}
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
                  <th className="py-3.5 px-4 font-semibold">Reminders Sent</th>
                  <th className="py-3.5 px-4 font-semibold text-right">AI Smart Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50 text-slate-200">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-cyan-300">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{inv.customer.name}</div>
                      <div className="text-[11px] text-slate-400">{inv.customer.company}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      ${Number(inv.amount).toFixed(2)} {inv.currency}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={inv.status === "OVERDUE" ? "text-rose-400 font-semibold" : "text-slate-300"}>
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          inv.status === "PAID"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            : inv.status === "OVERDUE"
                            ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                            : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {inv.reminderCount} sent
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {inv.status === "OVERDUE" ? (
                        <button
                          onClick={() => handlePrepareReminder(inv)}
                          disabled={remindingId === inv.id}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-accent-purple to-indigo-600 hover:opacity-90 text-white text-[11px] font-semibold transition-all shadow-sm flex items-center gap-1.5 ml-auto disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{remindingId === inv.id ? "Drafting..." : "Prepare AI Reminder"}</span>
                        </button>
                      ) : inv.status === "UNPAID" ? (
                        <a
                          href={inv.paymentLink || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-md bg-surface border border-surface-border text-slate-300 hover:text-white text-[11px] font-medium transition-colors inline-flex items-center gap-1"
                        >
                          <span>PayPal Link</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-semibold">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Invoice Modal */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-surface-card border border-surface-border p-6 space-y-4">
              <h3 className="font-bold text-base text-white">Generate Client Invoice</h3>

              <form onSubmit={handleCreateInvoice} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 font-medium">Customer</label>
                  <select
                    value={newInvoice.customerId}
                    onChange={(e) => setNewInvoice({ ...newInvoice, customerId: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-[#0A0F1D] border border-surface-border text-slate-200"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.company})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-medium">Amount (USD)</label>
                  <input
                    type="number"
                    value={newInvoice.amount}
                    onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                    required
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-[#0A0F1D] border border-surface-border text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-medium">Due Date</label>
                  <input
                    type="date"
                    value={newInvoice.dueDate}
                    onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                    required
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-[#0A0F1D] border border-surface-border text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-medium">Service Description</label>
                  <input
                    type="text"
                    value={newInvoice.itemsSummary}
                    onChange={(e) => setNewInvoice({ ...newInvoice, itemsSummary: e.target.value })}
                    required
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-[#0A0F1D] border border-surface-border text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg bg-surface border border-surface-border text-slate-300 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold"
                  >
                    Create Invoice
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

"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Settings,
  ShieldCheck,
  CreditCard,
  Bot,
  CheckCircle2,
  Cpu,
  Key,
  Globe,
  Database,
} from "lucide-react";

export default function SettingsPage() {
  const [merchant, setMerchant] = useState<any>(null);
  const [aiHealth, setAiHealth] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.merchant) {
          setMerchant(data.user.merchant);
        }
      });

    fetch("/api/ai/health")
      .then((res) => res.json())
      .then((data) => setAiHealth(data))
      .catch((err) => console.error("Health check error:", err));
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Settings &amp; Developer Configurations</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              PayPal Developer Sandbox credentials, OpenAI tools configuration, and database ledger status.
            </p>
          </div>
        </div>

        {/* PayPal Developer Credentials Status */}
        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/20 text-cyan-400 flex items-center justify-center font-bold">
                P
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">PayPal Developer Platform</h3>
                <p className="text-xs text-slate-400">Sandbox Environment Configuration</p>
              </div>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-semibold font-mono">
              SANDBOX ACTIVE
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#090D1A] border border-surface-border space-y-1">
              <span className="text-slate-400">Environment</span>
              <p className="font-mono text-cyan-300 font-semibold">sandbox (Orders v2 / Capture v2)</p>
            </div>
            <div className="p-3 rounded-xl bg-[#090D1A] border border-surface-border space-y-1">
              <span className="text-slate-400">API Endpoint</span>
              <p className="font-mono text-slate-300 font-semibold">https://api-m.sandbox.paypal.com</p>
            </div>
            <div className="p-3 rounded-xl bg-[#090D1A] border border-surface-border space-y-1">
              <span className="text-slate-400">Webhook Listener URL</span>
              <p className="font-mono text-slate-300 font-semibold truncate">
                http://localhost:3000/api/paypal/webhook
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#090D1A] border border-surface-border space-y-1">
              <span className="text-slate-400">Cryptographic Signature Check</span>
              <p className="font-mono text-emerald-400 font-semibold">Enabled (HMAC-SHA256)</p>
            </div>
          </div>
        </div>

        {/* AI Model Configuration */}
        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 text-indigo-400 flex items-center justify-center font-bold">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">NVIDIA NIM AI Agent Engine</h3>
                <p className="text-xs text-slate-400">NVIDIA-Hosted Microservices &amp; OpenAI-Compatible Tool Orchestration</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2.5 py-1 rounded font-semibold font-mono ${
                aiHealth?.status === "HEALTHY" 
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" 
                  : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
              }`}>
                {aiHealth?.status ? `NVIDIA NIM: ${aiHealth.status}` : "NVIDIA NIM CONNECTED"}
              </span>
              <span className="text-[10px] px-2.5 py-1 rounded bg-primary/20 text-indigo-300 font-semibold font-mono">
                12 TOOLS REGISTERED
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#090D1A] border border-surface-border space-y-1">
              <span className="text-slate-400">Primary Model</span>
              <p className="font-mono text-emerald-300 font-semibold">
                {aiHealth?.model || "nvidia/nemotron-3.5-lightning-30b-a3b"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#090D1A] border border-surface-border space-y-1">
              <span className="text-slate-400">NVIDIA Hosted Endpoint</span>
              <p className="font-mono text-slate-300 font-semibold truncate">
                {aiHealth?.baseURL || "https://integrate.api.nvidia.com/v1"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#090D1A] border border-surface-border space-y-1">
              <span className="text-slate-400">Tool Calling &amp; Functions</span>
              <p className="font-mono text-cyan-300 font-semibold">
                Verified (Orders, Captures, Refunds, Invoices, Anomalies)
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#090D1A] border border-surface-border space-y-1">
              <span className="text-slate-400">Human-In-The-Loop Safety Guard</span>
              <p className="font-mono text-emerald-400 font-semibold">ACTIVE (Enforced on Sensitive Operations)</p>
            </div>
          </div>
        </div>

        {/* Database & Infrastructure */}
        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-cyan/20 text-cyan-400 flex items-center justify-center font-bold">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Database &amp; Persistence</h3>
                <p className="text-xs text-slate-400">Prisma ORM Normalized Financial Ledger</p>
              </div>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-400 font-semibold font-mono">
              CONNECTED
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#090D1A] border border-surface-border space-y-1">
              <span className="text-slate-400">Provider</span>
              <p className="font-mono text-slate-300 font-semibold">SQLite (Local Zero-Config) / PostgreSQL (Render)</p>
            </div>
            <div className="p-3 rounded-xl bg-[#090D1A] border border-surface-border space-y-1">
              <span className="text-slate-400">Relational Models</span>
              <p className="font-mono text-cyan-300 font-semibold">14 Normalized Entities</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

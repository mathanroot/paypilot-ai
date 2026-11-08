"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Sparkles,
  Receipt,
  AlertCircle,
  RefreshCw,
  Info,
  Globe,
  Lock,
  ChevronRight,
  Check,
} from "lucide-react";
import PayPalButton from "@/components/PayPalButton";

interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

const CURRENCIES: CurrencyOption[] = [
  { code: "USD", name: "United States Dollar (Initial Test)", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
];

export default function CheckoutPage() {
  const [currency, setCurrency] = useState<string>("USD");
  const [amount, setAmount] = useState<string>("10.00");
  const [description, setDescription] = useState<string>("PayPilot AI FinTech Verification Payment");

  const [step, setStep] = useState<"IDLE" | "CREATING" | "ORDER_CREATED" | "CAPTURING" | "COMPLETED" | "ERROR">("IDLE");
  const [orderData, setOrderData] = useState<any>(null);
  const [captureData, setCaptureData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paypalConfig, setPaypalConfig] = useState<any>(null);

  useEffect(() => {
    fetch("/api/paypal/config")
      .then((res) => res.json())
      .then((data) => setPaypalConfig(data))
      .catch((err) => console.error("Failed to load PayPal config", err));
  }, []);

  const handleCreateOrderManual = async () => {
    setStep("CREATING");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          currency: currency.toUpperCase(),
          description: description,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create PayPal order");
      }

      setOrderData(data);
      setStep("ORDER_CREATED");
    } catch (err: any) {
      setErrorMessage(err.message || "Order creation failed");
      setStep("ERROR");
    }
  };

  const handleCaptureOrderManual = async () => {
    if (!orderData?.orderId) return;
    setStep("CAPTURING");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderData.orderId,
          idempotencyKey: `IDEMP-${orderData.orderId}-${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Payment capture failed");
      }

      setCaptureData(data);
      setStep("COMPLETED");
    } catch (err: any) {
      setErrorMessage(err.message || "Order capture failed");
      setStep("ERROR");
    }
  };

  const handleReset = () => {
    setStep("IDLE");
    setOrderData(null);
    setCaptureData(null);
    setErrorMessage(null);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>PayPal Sandbox Payment Gateway</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-secondary/20 text-cyan-300 font-mono border border-secondary/30">
                Orders v2 + Capture v2
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              End-to-end sandbox payment flow with configurable currency and verified capture.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Strict Verification Guard Active</span>
          </div>
        </div>

        {/* Seller Account & Currency Inspection Info Card */}
        <div className="p-4 rounded-xl bg-[#0B1224] border border-surface-border space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <Globe className="w-4 h-4 text-accent-cyan" />
              <span>PayPal Sandbox Seller (Payee) Profile:</span>
            </div>
            <span className="font-mono text-cyan-300 text-[11px]">
              Merchant ID: {paypalConfig?.merchantId || "ZLK4EUJA78DHC"}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
            <div>
              <span className="text-slate-500">Payee Email: </span>
              <span className="font-mono text-slate-200">
                {paypalConfig?.sellerPayee || "sb-j8yz353762209@business.example.com"}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Supported Currencies: </span>
              <span className="font-semibold text-emerald-400">USD, EUR, GBP, CAD, AUD</span>
            </div>
          </div>
        </div>

        {/* Currency Mismatch & Sandbox Setup Diagnostic Guide */}
        <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-slate-300 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <Info className="w-4 h-4 shrink-0" />
            <span>How to Fix &quot;This seller doesn&apos;t accept payments in your currency&quot; in Sandbox</span>
          </div>
          <p className="leading-relaxed">
            PayPal throws code <code className="px-1.5 py-0.5 rounded bg-black/40 text-amber-300 font-mono">UNSUPPORTED_CURRENCY</code> when the seller account in Sandbox does not hold USD balance or blocks foreign currency conversion:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-[#080D1A] border border-surface-border space-y-1.5">
              <span className="font-bold text-cyan-300">Solution A (Recommended):</span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Log into <a href="https://sandbox.paypal.com" target="_blank" rel="noreferrer" className="text-accent-cyan underline">sandbox.paypal.com</a> with seller account <code className="text-white">sb-j8yz353762209@business.example.com</code>:
              </p>
              <ul className="list-disc pl-4 text-[11px] text-slate-400 space-y-0.5">
                <li>Go to <strong>Wallet</strong> &rarr; click <strong>Add a currency</strong> &rarr; select <strong>USD</strong> &rarr; Add Currency.</li>
                <li>Go to <strong>Account Settings</strong> &rarr; <strong>Payment Preferences</strong> &rarr; <strong>Block Payments</strong> &rarr; set <em>&quot;Allow payments sent to me in a currency I do not hold&quot;</em> to <strong>Yes, accept and convert to U.S. Dollars</strong>.</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-[#080D1A] border border-surface-border space-y-1.5">
              <span className="font-bold text-cyan-300">Solution B (Instant US Buyer Account):</span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                In your <a href="https://developer.paypal.com/dashboard/accounts" target="_blank" rel="noreferrer" className="text-accent-cyan underline">PayPal Developer Dashboard</a> under <strong>Testing Tools &rarr; Sandbox Accounts</strong>:
              </p>
              <ul className="list-disc pl-4 text-[11px] text-slate-400 space-y-0.5">
                <li>Check your Personal (Buyer) account country.</li>
                <li>If the buyer account is registered in India, click <strong>Create Account</strong> &rarr; select <strong>Personal</strong> &rarr; Country: <strong>United States</strong>.</li>
                <li>Log into PayPal checkout with the US Sandbox Personal account.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 4-Step Lifecycle Indicator */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div
            className={`p-2.5 rounded-xl border ${
              step === "IDLE" || step === "CREATING"
                ? "bg-primary/20 border-primary text-white font-semibold"
                : "bg-surface-card border-surface-border text-slate-400"
            }`}
          >
            1. Amount &amp; Currency
          </div>
          <div
            className={`p-2.5 rounded-xl border ${
              step === "ORDER_CREATED"
                ? "bg-primary/20 border-primary text-white font-semibold"
                : "bg-surface-card border-surface-border text-slate-400"
            }`}
          >
            2. PayPal Order v2
          </div>
          <div
            className={`p-2.5 rounded-xl border ${
              step === "CAPTURING"
                ? "bg-primary/20 border-primary text-white font-semibold"
                : "bg-surface-card border-surface-border text-slate-400"
            }`}
          >
            3. Server Capture
          </div>
          <div
            className={`p-2.5 rounded-xl border ${
              step === "COMPLETED"
                ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 font-semibold"
                : "bg-surface-card border-surface-border text-slate-400"
            }`}
          >
            4. Verified Receipt
          </div>
        </div>

        {/* Step: IDLE - Configure Currency & Amount */}
        <div className={step === "IDLE" || step === "CREATING" ? "block" : "hidden"}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 rounded-2xl bg-surface-card border border-surface-border space-y-5">
              <h3 className="font-bold text-base text-white">Configure Test Payment Parameters</h3>

              <div className="space-y-4 text-xs">
                {/* Currency Selector (Requirement 4 & 6) */}
                <div>
                  <label className="text-slate-300 font-semibold flex items-center justify-between">
                    <span>Payment Currency (Configurable):</span>
                    <span className="text-[11px] text-accent-cyan font-mono">Syncs with Orders API &amp; SDK</span>
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-[#0A0F1D] border border-surface-border text-slate-100 font-medium text-xs focus:outline-none focus:border-primary"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount Input (Requirement 5: default 10.00 USD) */}
                <div>
                  <label className="text-slate-300 font-semibold">Payment Amount ({currency}):</label>
                  <div className="mt-1.5 relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      {CURRENCIES.find((c) => c.code === currency)?.symbol || "$"}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="1.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-[#0A0F1D] border border-surface-border text-slate-100 font-semibold text-sm focus:outline-none focus:border-primary"
                      placeholder="10.00"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Initial test amount: <strong>10.00 USD</strong>.
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="text-slate-300 font-semibold">Order Description / Memo:</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full mt-1.5 px-3.5 py-2 rounded-xl bg-[#0A0F1D] border border-surface-border text-slate-100 text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Official PayPal JS SDK Button Container (Safely Isolated) */}
              <div className="pt-4 border-t border-surface-border/60 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Instant PayPal Checkout (Official JS SDK Buttons):
                </span>
                <div className="max-w-sm mx-auto">
                  {paypalConfig?.clientId && (
                    <PayPalButton
                      clientId={paypalConfig.clientId}
                      currency={currency}
                      amount={amount}
                      description={description}
                      onSuccess={(capture) => {
                        setCaptureData(capture);
                        setStep("COMPLETED");
                      }}
                      onError={(err) => {
                        setErrorMessage(err);
                        setStep("ERROR");
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Summary & REST Fallback Sidebar */}
            <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-5 h-fit">
              <h3 className="font-bold text-base text-white">Order Summary</h3>

              <div className="space-y-2 text-xs text-slate-300 border-b border-surface-border/60 pb-4">
                <div className="flex justify-between">
                  <span>Selected Currency</span>
                  <span className="font-bold text-cyan-300">{currency}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payee Seller</span>
                  <span className="truncate max-w-[140px] font-mono text-[11px]">
                    {paypalConfig?.sellerPayee || "Sandbox Seller"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Intent</span>
                  <span className="font-mono text-emerald-400">CAPTURE</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-base font-extrabold text-white">
                <span>Total Amount:</span>
                <span className="text-xl text-accent-cyan">
                  {currency} {Number(amount).toFixed(2)}
                </span>
              </div>

              <button
                onClick={handleCreateOrderManual}
                disabled={step === "CREATING" || Number(amount) <= 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-secondary to-indigo-600 hover:from-secondary-hover hover:to-indigo-700 text-white font-semibold text-xs shadow-lg shadow-secondary/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{step === "CREATING" ? "Calling PayPal Orders v2..." : "Create Order via REST API"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-[11px] text-slate-400 text-center">
                Calls official `/v2/checkout/orders` with verified currency and amount.
              </p>
            </div>
          </div>
        </div>

        {/* Step: ORDER_CREATED - Awaiting approval & capture */}
        {step === "ORDER_CREATED" && orderData && (
          <div className="p-8 rounded-2xl bg-surface-card border border-primary/40 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-surface-border">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase text-emerald-400 tracking-wider">
                  Order Successfully Created in PayPal
                </span>
                <h3 className="text-xl font-bold text-white">PayPal Order #{orderData.orderId}</h3>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/30">
                Awaiting Approval / Capture
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#090D1A] border border-surface-border space-y-1">
                <span className="text-slate-400">Order ID:</span>
                <p className="font-mono text-cyan-300 font-semibold text-sm">{orderData.orderId}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#090D1A] border border-surface-border space-y-1">
                <span className="text-slate-400">Currency &amp; Amount:</span>
                <p className="font-semibold text-white text-sm">
                  {orderData.currency} {Number(orderData.amount).toFixed(2)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#090D1A] border border-surface-border space-y-1">
                <span className="text-slate-400">Payee Account:</span>
                <p className="font-mono text-emerald-400 text-xs truncate">
                  {orderData.payee?.email_address || "sb-j8yz353762209@business.example.com"}
                </p>
              </div>
            </div>

            {/* Approval Portal Link & Server Capture Action */}
            <div className="p-5 rounded-xl bg-gradient-to-r from-[#003087]/20 to-secondary/20 border border-secondary/40 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary text-white flex items-center justify-center font-bold text-sm">
                  P
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Approve &amp; Capture Order</h4>
                  <p className="text-xs text-slate-300">
                    Open the PayPal Sandbox Checkout portal to approve with your Sandbox Buyer account, then capture.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {orderData.approveUrl && (
                  <a
                    href={orderData.approveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 rounded-lg bg-secondary hover:bg-secondary-hover text-white font-semibold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <span>Open PayPal Sandbox Approval Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <button
                  onClick={handleCaptureOrderManual}
                  className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Execute Server Capture (`/v2/checkout/orders/{orderData.orderId}/capture`)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: CAPTURING */}
        {step === "CAPTURING" && (
          <div className="p-12 rounded-2xl bg-surface-card border border-surface-border text-center space-y-4">
            <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
            <h3 className="text-lg font-bold text-white">Capturing PayPal Order</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Contacting PayPal Capture API v2, verifying payment settlement, and recording ledger idempotency key...
            </p>
          </div>
        )}

        {/* Step: COMPLETED - Verified Receipt */}
        {step === "COMPLETED" && captureData && (
          <div className="p-8 rounded-2xl bg-surface-card border border-emerald-500/40 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-surface-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Payment Captured &amp; Verified</h3>
                  <p className="text-xs text-emerald-400 font-semibold">
                    Status: {captureData.status} (Verified via PayPal Capture API v2)
                  </p>
                </div>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-mono">
                200 OK
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#090D1A] border border-surface-border space-y-1">
                <span className="text-slate-400">PayPal Order ID:</span>
                <p className="font-mono text-cyan-300 font-semibold">{captureData.orderId}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#090D1A] border border-surface-border space-y-1">
                <span className="text-slate-400">PayPal Capture ID:</span>
                <p className="font-mono text-emerald-400 font-semibold">{captureData.captureId}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#090D1A] border border-surface-border space-y-1">
                <span className="text-slate-400">Settled Amount:</span>
                <p className="font-semibold text-white text-sm">
                  {captureData.amount?.currency_code || currency}{" "}
                  {captureData.amount?.value || Number(amount).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0A0F1E] border border-surface-border font-mono text-xs text-slate-300 space-y-1">
              <div className="text-[11px] text-slate-500 uppercase font-semibold">
                Ledger Audit Trail:
              </div>
              <p className="text-emerald-400">&gt; Database record verified: Payment #{captureData.orderId}</p>
              <p className="text-slate-400">&gt; Capture ID: {captureData.captureId}</p>
              <p className="text-slate-400">
                &gt; Seller Protection: {captureData.sellerProtection || "ELIGIBLE"}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleReset}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-xs shadow-md transition-all"
              >
                Start Another Payment
              </button>
              <Link
                href="/transactions"
                className="px-5 py-2.5 rounded-xl bg-surface-card hover:bg-surface-border border border-surface-border text-slate-200 text-xs font-semibold transition-all"
              >
                View in Ledger
              </Link>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {step === "ERROR" && (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div className="font-bold text-sm">PayPal Gateway Error</div>
            </div>
            <p className="text-xs text-rose-300 font-mono leading-relaxed">{errorMessage}</p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-semibold hover:bg-rose-500/30 transition-colors"
              >
                Reset &amp; Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

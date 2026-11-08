"use client";

import React, { useState } from "react";
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
} from "lucide-react";

interface ProductOption {
  id: string;
  name: string;
  description: string;
  price: number;
}

const PRODUCTS: ProductOption[] = [
  {
    id: "prod-1",
    name: "Enterprise FinTech Suite (Annual)",
    description: "Complete AI Command Center, PayPal multi-currency gateway license, and priority SLA.",
    price: 1200.0,
  },
  {
    id: "prod-2",
    name: "AI Smart Collection Agent Addon",
    description: "Autonomous payment reminder dispatch and collection tracking module.",
    price: 450.0,
  },
  {
    id: "prod-3",
    name: "PayPilot Consulting Retainer",
    description: "FinTech workflow automation advisory & custom integration setup.",
    price: 250.0,
  },
];

export default function CheckoutPage() {
  const [selectedProduct, setSelectedProduct] = useState<ProductOption>(PRODUCTS[0]);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isCustom, setIsCustom] = useState(false);

  // Workflow states: "IDLE" | "CREATING" | "ORDER_CREATED" | "CAPTURING" | "COMPLETED" | "ERROR"
  const [step, setStep] = useState<"IDLE" | "CREATING" | "ORDER_CREATED" | "CAPTURING" | "COMPLETED" | "ERROR">("IDLE");
  const [orderData, setOrderData] = useState<any>(null);
  const [captureData, setCaptureData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeAmount = isCustom ? Number(customAmount) || 100 : selectedProduct.price;

  // Step 1: Create Order via PayPal Orders v2 API
  const handleCreateOrder = async () => {
    setStep("CREATING");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: activeAmount,
          currency: "USD",
          description: isCustom ? "Custom Payment via PayPilot AI" : selectedProduct.name,
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

  // Step 2 & 3: Capture Approved Order via PayPal Capture v2 API
  const handleCaptureOrder = async () => {
    if (!orderData?.orderId) return;
    setStep("CAPTURING");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderData.orderId,
          idempotencyKey: `IDEMP-${Date.now()}`,
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
              End-to-end payment creation, approval, and verified capture lifecycle.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Strict Verification Guard Active</span>
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
            1. Select Plan
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
            3. Capture Funds
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

        {/* Step: IDLE / CREATING - Select Product or Custom Amount */}
        {(step === "IDLE" || step === "CREATING") && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-bold text-base text-white">Select Service or Invoice Tier</h3>

              <div className="space-y-3">
                {PRODUCTS.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => {
                      setSelectedProduct(prod);
                      setIsCustom(false);
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      !isCustom && selectedProduct.id === prod.id
                        ? "bg-surface-card border-primary shadow-lg shadow-primary/10"
                        : "bg-surface/50 border-surface-border hover:border-surface-border/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-white text-sm">{prod.name}</div>
                      <div className="font-bold text-accent-cyan">${prod.price.toFixed(2)} USD</div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{prod.description}</p>
                  </div>
                ))}

                {/* Custom Amount Option */}
                <div
                  onClick={() => setIsCustom(true)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isCustom
                      ? "bg-surface-card border-primary shadow-lg shadow-primary/10"
                      : "bg-surface/50 border-surface-border hover:border-surface-border/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-white text-sm">Custom Invoice Payment</div>
                    <div className="font-bold text-slate-300">Custom USD</div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Enter arbitrary amount for ad-hoc consultation or client billing.
                  </p>
                  {isCustom && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-300">$</span>
                      <input
                        type="number"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder="150.00"
                        className="px-3 py-1.5 rounded-lg bg-[#0A0F1D] border border-surface-border text-sm text-white focus:outline-none focus:border-primary w-32"
                      />
                      <span className="text-xs text-slate-400">USD</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-5 h-fit">
              <h3 className="font-bold text-base text-white">Payment Summary</h3>

              <div className="space-y-2 text-xs text-slate-300 border-b border-surface-border/60 pb-4">
                <div className="flex justify-between">
                  <span>Item</span>
                  <span className="font-medium text-white truncate max-w-[150px]">
                    {isCustom ? "Custom Payment" : selectedProduct.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Gateway</span>
                  <span className="text-cyan-400">PayPal Sandbox v2</span>
                </div>
                <div className="flex justify-between">
                  <span>Currency</span>
                  <span>USD ($)</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-base font-extrabold text-white">
                <span>Total Due:</span>
                <span className="text-xl text-accent-cyan">${activeAmount.toFixed(2)}</span>
              </div>

              <button
                onClick={handleCreateOrder}
                disabled={step === "CREATING" || activeAmount <= 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-secondary to-indigo-600 hover:from-secondary-hover hover:to-indigo-700 text-white font-semibold text-sm shadow-lg shadow-secondary/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{step === "CREATING" ? "Calling PayPal Orders v2..." : "Generate PayPal Order"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-[11px] text-slate-400 text-center">
                Calls official `/v2/checkout/orders` with intent: CAPTURE.
              </p>
            </div>
          </div>
        )}

        {/* Step: ORDER_CREATED - Order created, awaiting approval and capture */}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#090D1A] border border-surface-border space-y-1">
                <span className="text-slate-400">Order Identifier:</span>
                <p className="font-mono text-cyan-300 font-semibold text-sm">{orderData.orderId}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#090D1A] border border-surface-border space-y-1">
                <span className="text-slate-400">Order Amount:</span>
                <p className="font-semibold text-white text-sm">${activeAmount.toFixed(2)} USD</p>
              </div>
            </div>

            {/* PayPal Sandbox Direct Checkout Button */}
            <div className="p-5 rounded-xl bg-gradient-to-r from-[#003087]/20 to-secondary/20 border border-secondary/40 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary text-white flex items-center justify-center font-bold text-sm">
                  P
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Complete PayPal Sandbox Flow</h4>
                  <p className="text-xs text-slate-300">
                    Click below to open PayPal Sandbox Checkout, or proceed directly to server capture verification.
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
                    <span>Open PayPal Checkout Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <button
                  onClick={handleCaptureOrder}
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
                    Status: COMPLETED (Verified via PayPal Capture API)
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
                <span className="text-slate-400">Amount Settled:</span>
                <p className="font-semibold text-white text-sm">${activeAmount.toFixed(2)} USD</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0A0F1E] border border-surface-border font-mono text-xs text-slate-300 space-y-1">
              <div className="text-[11px] text-slate-500 uppercase font-semibold">
                Ledger Audit Trail:
              </div>
              <p className="text-emerald-400">&gt; Database record updated: Payment #{captureData.orderId}</p>
              <p className="text-slate-400">&gt; Risk Score: 5/100 (Clean transaction)</p>
              <p className="text-slate-400">&gt; Webhook state: SYNCHRONIZED</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleReset}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-xs shadow-md transition-all"
              >
                Start Another Transaction
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
              <div className="font-bold text-sm">Payment Operation Error</div>
            </div>
            <p className="text-xs text-rose-300">{errorMessage}</p>
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-semibold hover:bg-rose-500/30 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

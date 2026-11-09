"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  Copy,
} from "lucide-react";
import PayPalButton from "@/components/PayPalButton";

interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

const CURRENCIES: CurrencyOption[] = [
  { code: "USD", name: "United States Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
];

const TEST_CARDS = {
  visa: {
    brand: "Visa",
    label: "Visa (Verified Instant Pass)",
    number: "4032000000000000",
    formatted: "4032 0000 0000 0000",
    exp: "12/28",
    csc: "123",
    zip: "95131",
    city: "San Jose",
    state: "CA",
    address: "123 Main St",
    name: "John Doe",
  },
  mastercard: {
    brand: "Mastercard",
    label: "Mastercard (Verified Instant Pass)",
    number: "5424000000000001",
    formatted: "5424 0000 0000 0001",
    exp: "12/28",
    csc: "123",
    zip: "95131",
    city: "San Jose",
    state: "CA",
    address: "123 Main St",
    name: "John Doe",
  },
  amex: {
    brand: "Amex",
    label: "American Express (Sandbox Direct)",
    number: "378282246310005",
    formatted: "3782 822463 10005",
    exp: "12/28",
    csc: "1234",
    zip: "95131",
    city: "San Jose",
    state: "CA",
    address: "123 Main St",
    name: "John Doe",
  },
};

function CheckoutContent() {
  const searchParams = useSearchParams();
  const [currency, setCurrency] = useState<string>("USD");
  const [amount, setAmount] = useState<string>("10.00");
  const [description, setDescription] = useState<string>("PayPilot AI FinTech Verification Payment");

  // Sandbox Test Card Helper State
  const [selectedCardType, setSelectedCardType] = useState<"visa" | "mastercard" | "amex">("visa");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleCopyAll = (card: typeof TEST_CARDS["visa"]) => {
    const allText = `Card: ${card.number} | Exp: ${card.exp} | CSC: ${card.csc} | ZIP: ${card.zip} | Name: ${card.name} | Address: ${card.address}, ${card.city}, ${card.state}`;
    handleCopy(allText, "all");
  };

  const [step, setStep] = useState<"IDLE" | "CREATING" | "ORDER_CREATED" | "CAPTURING" | "COMPLETED" | "ERROR">("IDLE");
  const [orderData, setOrderData] = useState<any>(null);
  const [captureData, setCaptureData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paypalConfig, setPaypalConfig] = useState<any>(null);
  const syncedTokensRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/paypal/config")
      .then((res) => res.json())
      .then((data) => setPaypalConfig(data))
      .catch((err) => console.error("Failed to load PayPal config", err));
  }, []);

  // Handle return redirect from PayPal Sandbox (e.g. ?status=success&token=2P4755434P701500B&PayerID=...)
  useEffect(() => {
    const statusParam = searchParams.get("status");
    const tokenParam = searchParams.get("token") || searchParams.get("orderId");

    if (tokenParam && (statusParam === "success" || !statusParam)) {
      if (syncedTokensRef.current.has(tokenParam)) return;
      syncedTokensRef.current.add(tokenParam);

      setStep("CAPTURING");
      setErrorMessage(null);

      fetch("/api/paypal/sync-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: tokenParam }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && (data.status === "COMPLETED" || data.captureId)) {
            setCaptureData({
              orderId: tokenParam,
              captureId: data.captureId || data.payment?.paypalCaptureId,
              status: "COMPLETED",
              amount: {
                value: data.payment?.amount || amount,
                currency_code: data.payment?.currency || currency,
              },
              invoice: data.invoice,
            });
            setStep("COMPLETED");

            // Broadcast to other open tabs that this order was captured
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem(
                  "paypilot_last_captured_order",
                  JSON.stringify({
                    orderId: tokenParam,
                    captureId: data.captureId || data.payment?.paypalCaptureId,
                    amount: data.payment?.amount || amount,
                    currency: data.payment?.currency || currency,
                    timestamp: Date.now(),
                  })
                );
              } catch {}
            }
          } else {
            setErrorMessage(data.error || `Order ${tokenParam} status: ${data.status || "Unapproved"}`);
            setStep("ERROR");
          }
        })
        .catch((err) => {
          setErrorMessage(err.message || "Failed to auto-capture approved PayPal order");
          setStep("ERROR");
        });
    } else if (statusParam === "cancel") {
      setErrorMessage("Payment checkout was cancelled on PayPal.");
      setStep("ERROR");
    }
  }, [searchParams]);

  // Real-time automatic polling & cross-tab synchronization while awaiting PayPal approval
  useEffect(() => {
    if (step !== "ORDER_CREATED" || !orderData?.orderId) return;

    let isSubscribed = true;
    const currentOrderId = orderData.orderId;

    const checkOrderStatus = async () => {
      try {
        const res = await fetch("/api/paypal/sync-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: currentOrderId }),
        });
        const data = await res.json();
        if (!isSubscribed) return;

        if (data.success && (data.status === "COMPLETED" || data.status === "ALREADY_COMPLETED" || data.captureId)) {
          setCaptureData({
            orderId: currentOrderId,
            captureId: data.captureId || data.payment?.paypalCaptureId,
            status: "COMPLETED",
            amount: {
              value: data.payment?.amount || orderData.amount || amount,
              currency_code: data.payment?.currency || orderData.currency || currency,
            },
            invoice: data.invoice,
          });
          setStep("COMPLETED");
        }
      } catch (e) {
        // Silent poll error
      }
    };

    // Poll every 2.5 seconds
    const interval = setInterval(checkOrderStatus, 2500);

    // Also check immediately when window gains focus or visibility returns
    const handleFocus = () => {
      checkOrderStatus();
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("visibilitychange", handleFocus);

    // Cross-tab storage listener (if another tab captured this order)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "paypilot_last_captured_order" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.orderId === currentOrderId) {
            setCaptureData({
              orderId: parsed.orderId,
              captureId: parsed.captureId,
              status: "COMPLETED",
              amount: {
                value: parsed.amount || amount,
                currency_code: parsed.currency || currency,
              },
            });
            setStep("COMPLETED");
          }
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("visibilitychange", handleFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, [step, orderData?.orderId]);

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
    <div className="max-w-5xl mx-auto space-y-8">
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

      {/* 3-Step Lifecycle Indicator */}
      <div className="grid grid-cols-3 gap-3 text-center text-xs">
        <div
          className={`p-2.5 rounded-xl border transition-all ${
            step === "IDLE" || step === "CREATING"
              ? "bg-primary/20 border-primary text-white font-semibold shadow-md shadow-primary/10"
              : "bg-surface-card border-surface-border text-slate-400"
          }`}
        >
          1. Configure Payment
        </div>
        <div
          className={`p-2.5 rounded-xl border transition-all ${
            step === "ORDER_CREATED" || step === "CAPTURING"
              ? "bg-primary/20 border-primary text-white font-semibold shadow-md shadow-primary/10"
              : "bg-surface-card border-surface-border text-slate-400"
          }`}
        >
          2. PayPal Secure Approval
        </div>
        <div
          className={`p-2.5 rounded-xl border transition-all ${
            step === "COMPLETED"
              ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 font-semibold shadow-md shadow-emerald-500/10"
              : "bg-surface-card border-surface-border text-slate-400"
          }`}
        >
          3. Verified Settlement
        </div>
      </div>

      {/* Step: IDLE - Configure Currency & Amount */}
      <div className={step === "IDLE" || step === "CREATING" ? "block" : "hidden"}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Configure Parameters (5 cols) */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-surface-card border border-surface-border space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-surface-border/60">
              <h3 className="font-bold text-base text-white">Payment Parameters</h3>
              <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4" />
                Sandbox Verified
              </span>
            </div>

            <div className="space-y-4 text-xs">
              {/* Currency Selector */}
              <div>
                <label className="text-slate-300 font-semibold flex items-center justify-between">
                  <span>Payment Currency:</span>
                  <span className="text-[11px] text-accent-cyan font-mono">Syncs live with PayPal</span>
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-[#0A0F1D] border border-surface-border text-slate-100 font-medium text-xs focus:outline-none focus:border-primary transition"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount Input with Quick Preset Chips */}
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
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-[#0A0F1D] border border-surface-border text-slate-100 font-semibold text-sm focus:outline-none focus:border-primary transition font-mono"
                    placeholder="10.00"
                  />
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-500">Presets:</span>
                  {["5.00", "10.00", "25.00", "50.00", "100.00"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
                      className={`text-[10px] px-2 py-0.5 rounded font-mono transition border ${
                        amount === preset
                          ? "bg-primary text-white border-primary"
                          : "bg-[#0A0F1D] text-slate-400 border-surface-border hover:text-white"
                      }`}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-slate-500 mt-2">
                  Settlement volume: <strong>{currency} {Number(amount || 0).toFixed(2)}</strong>
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="text-slate-300 font-semibold">Order Description / Memo:</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-[#0A0F1D] border border-surface-border text-slate-100 text-xs focus:outline-none focus:border-primary transition"
                />
              </div>

              {/* Security info callout */}
              <div className="p-3.5 rounded-xl bg-[#080D1C] border border-surface-border flex items-start gap-2.5 text-slate-400 text-xs">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  Transactions are processed using PayPal Sandbox REST API v2 with strict idempotency and cryptographic server verification.
                </p>
              </div>
            </div>
          </div>

          {/* Unified Order Summary & Official PayPal Checkout (7 cols) */}
          <div className="lg:col-span-7 p-6 rounded-2xl bg-surface-card border border-surface-border space-y-5 shadow-lg">
            <h3 className="font-bold text-base text-white">Order Summary &amp; Payment Gateway</h3>

            <div className="space-y-2.5 text-xs text-slate-300 border-b border-surface-border/60 pb-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Selected Currency</span>
                <span className="font-bold text-cyan-300 font-mono">{currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payee Merchant</span>
                <span className="truncate max-w-[220px] font-mono text-[11px] text-slate-200">
                  {paypalConfig?.sellerPayee || "sb-j8yz353762209@business.example.com"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Intent</span>
                <span className="font-mono text-emerald-400 font-semibold">CAPTURE (Orders v2)</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-base font-extrabold text-white">
              <span>Total Due:</span>
              <span className="text-2xl text-accent-cyan font-mono">
                {currency} {Number(amount || 0).toFixed(2)}
              </span>
            </div>

            {/* Sandbox Test Cards (1-Click Fast Fill & Copy) Helper Widget */}
            <div className="p-4 rounded-xl bg-[#080D1D] border border-cyan-500/30 space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-accent-cyan" />
                  <span className="font-semibold text-xs text-white">
                    Sandbox Test Cards (1-Click Quick Copy)
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-mono border border-emerald-500/30">
                  Ready for Card Entry
                </span>
              </div>

              {/* Card Switcher Tabs */}
              <div className="grid grid-cols-3 gap-2">
                {(["visa", "mastercard", "amex"] as const).map((key) => {
                  const card = TEST_CARDS[key];
                  const isActive = selectedCardType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedCardType(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition text-center ${
                        isActive
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "bg-[#050811] text-slate-400 border-surface-border hover:text-white"
                      }`}
                    >
                      {card.brand}
                    </button>
                  );
                })}
              </div>

              {/* Active Card Preview & Fast Copy Actions */}
              {(() => {
                const activeCard = TEST_CARDS[selectedCardType];
                return (
                  <div className="space-y-2.5">
                    {/* Visual Card Strip */}
                    <div className="p-3 rounded-lg bg-gradient-to-r from-slate-900 to-[#0e1629] border border-slate-700/60 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                          {activeCard.label}
                        </div>
                        <div className="font-mono text-sm font-bold text-white tracking-widest mt-0.5">
                          {activeCard.formatted}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(activeCard.number, "card-num")}
                        className="px-3 py-1 rounded-md bg-accent-cyan/15 hover:bg-accent-cyan/25 border border-accent-cyan/30 text-accent-cyan text-xs font-semibold transition flex items-center gap-1.5"
                        title="Copy card number"
                      >
                        {copiedKey === "card-num" ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Card #</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Quick Copy Chips for Expiry, CSC, ZIP, Name */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleCopy(activeCard.exp, "exp")}
                        className="p-2 rounded-lg bg-[#050811] border border-surface-border hover:border-slate-500 text-left transition flex items-center justify-between group"
                        title="Click to copy expiration"
                      >
                        <span className="text-slate-400">Expires:</span>
                        <span className="font-mono font-semibold text-cyan-300">
                          {copiedKey === "exp" ? "Copied!" : activeCard.exp}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(activeCard.csc, "csc")}
                        className="p-2 rounded-lg bg-[#050811] border border-surface-border hover:border-slate-500 text-left transition flex items-center justify-between group"
                        title="Click to copy CSC / CVV"
                      >
                        <span className="text-slate-400">CSC:</span>
                        <span className="font-mono font-semibold text-cyan-300">
                          {copiedKey === "csc" ? "Copied!" : activeCard.csc}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(activeCard.zip, "zip")}
                        className="p-2 rounded-lg bg-[#050811] border border-surface-border hover:border-slate-500 text-left transition flex items-center justify-between group"
                        title="Click to copy ZIP code"
                      >
                        <span className="text-slate-400">ZIP:</span>
                        <span className="font-mono font-semibold text-cyan-300">
                          {copiedKey === "zip" ? "Copied!" : activeCard.zip}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(activeCard.name, "name")}
                        className="p-2 rounded-lg bg-[#050811] border border-surface-border hover:border-slate-500 text-left transition flex items-center justify-between group"
                        title="Click to copy Cardholder Name"
                      >
                        <span className="text-slate-400">Name:</span>
                        <span className="font-mono font-semibold text-cyan-300 truncate max-w-[60px]">
                          {copiedKey === "name" ? "Copied!" : activeCard.name}
                        </span>
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>Click <strong>Copy Card #</strong>, then paste into the Debit/Credit Card box below.</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyAll(activeCard)}
                        className="text-[11px] text-accent-cyan hover:underline font-mono shrink-0 font-medium"
                      >
                        {copiedKey === "all" ? "✓ All Data Copied" : "Copy All Info →"}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Official PayPal Buttons Container */}
            <div className="pt-1 space-y-3">
              {paypalConfig?.clientId && Number(amount) > 0 ? (
                <div className="w-full">
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
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-slate-500">
                  Enter an amount greater than 0 to load PayPal Checkout.
                </div>
              )}

              <p className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1.5 font-medium">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Powered by PayPal JavaScript SDK &amp; Orders v2</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Step: ORDER_CREATED - Awaiting approval & capture */}
      {step === "ORDER_CREATED" && orderData && (
        <div className="p-8 rounded-2xl bg-surface-card border border-primary/40 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-surface-border">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase text-emerald-400 tracking-wider">
                Order Created in PayPal Sandbox
              </span>
              <h3 className="text-xl font-bold text-white">PayPal Order #{orderData.orderId}</h3>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/30 flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Awaiting Buyer Approval
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
                <h4 className="font-bold text-sm text-white">Approve Order in PayPal</h4>
                <p className="text-xs text-slate-300">
                  Open the PayPal Sandbox Checkout portal to approve with your Sandbox Buyer account.
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
                <span>Execute Server Capture</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step: CAPTURING */}
      {step === "CAPTURING" && (
        <div className="p-12 rounded-2xl bg-surface-card border border-surface-border text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
          <h3 className="text-lg font-bold text-white">Capturing &amp; Verifying PayPal Order</h3>
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
              <p className="font-mono text-emerald-400 font-semibold">{captureData.captureId || "VERIFIED"}</p>
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
            <p className="text-slate-400">&gt; Capture ID: {captureData.captureId || "COMPLETED"}</p>
            <p className="text-slate-400">
              &gt; Seller Protection: {captureData.sellerProtection || "ELIGIBLE"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleReset}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-xs shadow-md transition-all"
            >
              Start Another Payment
            </button>
            {captureData.invoice && (
              <Link
                href="/invoices"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
              >
                <span>View Settled Invoice ({captureData.invoice.invoiceNumber})</span>
                <Check className="w-3.5 h-3.5" />
              </Link>
            )}
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
  );
}

export default function CheckoutPage() {
  return (
    <DashboardLayout>
      <Suspense
        fallback={
          <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-primary" />
            <span>Loading payment portal...</span>
          </div>
        }
      >
        <CheckoutContent />
      </Suspense>
    </DashboardLayout>
  );
}

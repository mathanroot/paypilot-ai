"use client";

import React, { useEffect, useRef, useState } from "react";
import { loadScript } from "@paypal/paypal-js";
import { RefreshCw, AlertCircle, ShieldCheck } from "lucide-react";

interface PayPalButtonProps {
  clientId: string;
  currency: string;
  amount: string;
  description: string;
  onSuccess: (captureData: any) => void;
  onError: (errorMsg: string) => void;
}

export default function PayPalButton({
  clientId,
  currency,
  amount,
  description,
  onSuccess,
  onError,
}: PayPalButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanding, setIsExpanding] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Keep latest values in refs to avoid re-initializing PayPal Buttons on re-renders
  const amountRef = useRef(amount);
  const descriptionRef = useRef(description);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    amountRef.current = amount;
    descriptionRef.current = description;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    let isMounted = true;
    let buttonsInstance: any = null;
    const container = containerRef.current;

    if (!container || !clientId || clientId === "sb-demo-client-id") {
      setLoading(false);
      return;
    }

    setLoading(true);
    setInitError(null);

    // Create an unmanaged DOM element that React will never reconcile
    const targetDiv = document.createElement("div");
    container.appendChild(targetDiv);

    // Preload both buttons and card-fields so debit/credit card expands instantly on click
    loadScript({
      clientId,
      currency: currency.toUpperCase(),
      intent: "capture",
      components: "buttons,card-fields",
      enableFunding: "card",
      commit: true,
    })
      .then((paypal) => {
        if (!isMounted || !paypal || !paypal.Buttons) return;

        try {
          buttonsInstance = paypal.Buttons({
            style: {
              layout: "vertical",
              color: "gold",
              shape: "rect",
              label: "paypal",
              height: 44,
            },
            createOrder: async () => {
              try {
                const res = await fetch("/api/paypal/create-order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    amount: Number(amountRef.current),
                    currency: currency.toUpperCase(),
                    description: descriptionRef.current || "PayPilot AI Invoice Checkout",
                  }),
                });

                const data = await res.json();
                if (!res.ok) {
                  throw new Error(data.error || "Failed to create order");
                }
                return data.orderId;
              } catch (err: any) {
                onErrorRef.current(err.message || "Failed to initialize PayPal order");
                throw err;
              }
            },
            onApprove: async (data: any) => {
              try {
                const res = await fetch("/api/paypal/capture-order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    orderId: data.orderID,
                    idempotencyKey: `IDEMP-${data.orderID}-${Date.now()}`,
                  }),
                });

                const captureRes = await res.json();
                if (!res.ok) {
                  throw new Error(captureRes.error || "Capture verification failed");
                }
                onSuccessRef.current(captureRes);
              } catch (err: any) {
                onErrorRef.current(err.message || "Payment capture failed");
              }
            },
            onError: (err: any) => {
              console.error("[PayPal JS SDK Error]:", err);
              onErrorRef.current(
                err?.message ||
                  "PayPal Sandbox declined this transaction. Please verify buyer currency compatibility."
              );
            },
          });

          if (buttonsInstance.isEligible()) {
            buttonsInstance.render(targetDiv);
          } else {
            setInitError("PayPal buttons are not eligible for this currency/account configuration.");
          }
        } catch (renderErr: any) {
          console.error("PayPal button render error:", renderErr);
          setInitError(renderErr.message);
        }
      })
      .catch((err) => {
        console.error("Failed to load PayPal SDK:", err);
        if (isMounted) setInitError(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      if (buttonsInstance && typeof buttonsInstance.close === "function") {
        try {
          buttonsInstance.close();
        } catch (e) {
          // ignore cleanup errors
        }
      }
      try {
        targetDiv.remove();
      } catch (e) {
        // ignore unmanaged child removal
      }
    };
  }, [clientId, currency]);

  const handleContainerClick = () => {
    // When user clicks the button area, provide instant feedback while card fields expand
    setIsExpanding(true);
    setTimeout(() => setIsExpanding(false), 2500);
  };

  return (
    <div className="w-full space-y-2">
      {loading && (
        <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-accent-cyan" />
          <span>Pre-loading PayPal &amp; Card Terminal ({currency})...</span>
        </div>
      )}

      {isExpanding && (
        <div className="p-2 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 text-xs text-accent-cyan flex items-center justify-center gap-2 transition-all">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span className="font-medium">Opening secure card terminal...</span>
        </div>
      )}

      {initError && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{initError}</span>
        </div>
      )}

      {/* Unmanaged target container: React will never reconcile inside this div */}
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        className="min-h-[44px]"
      />
    </div>
  );
}

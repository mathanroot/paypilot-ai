"use client";

import React, { useEffect, useRef, useState } from "react";
import { loadScript } from "@paypal/paypal-js";
import { RefreshCw, AlertCircle } from "lucide-react";

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
  const [initError, setInitError] = useState<string | null>(null);

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

    loadScript({
      clientId,
      currency: currency.toUpperCase(),
      intent: "capture",
      components: "buttons",
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
                    amount: Number(amount),
                    currency: currency.toUpperCase(),
                    description: description || "PayPilot AI Invoice Checkout",
                  }),
                });

                const data = await res.json();
                if (!res.ok) {
                  throw new Error(data.error || "Failed to create order");
                }
                return data.orderId;
              } catch (err: any) {
                onError(err.message || "Failed to initialize PayPal order");
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
                onSuccess(captureRes);
              } catch (err: any) {
                onError(err.message || "Payment capture failed");
              }
            },
            onError: (err: any) => {
              console.error("[PayPal JS SDK Error]:", err);
              onError(
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
      if (container && container.contains(targetDiv)) {
        try {
          container.removeChild(targetDiv);
        } catch (e) {
          // ignore unmanaged child removal
        }
      }
    };
  }, [clientId, currency, amount, description, onSuccess, onError]);

  return (
    <div className="w-full">
      {loading && (
        <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
          <span>Loading PayPal Checkout Buttons ({currency})...</span>
        </div>
      )}
      {initError && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{initError}</span>
        </div>
      )}
      {/* Unmanaged target container: React will never reconcile inside this div */}
      <div ref={containerRef} className="min-h-[44px]" />
    </div>
  );
}

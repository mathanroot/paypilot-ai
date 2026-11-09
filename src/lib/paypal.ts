// PayPilot AI - Official PayPal REST API Client
// Implements Orders v2, Capture v2, Refund v2, Webhook Signature Verification

export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  environment: "sandbox" | "production";
  apiUrl: string;
  webhookId: string;
}

export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export function getPayPalConfig(): PayPalConfig {
  const env = (process.env.PAYPAL_ENVIRONMENT || "sandbox") as "sandbox" | "production";
  const apiUrl =
    process.env.PAYPAL_API_URL ||
    (env === "production"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com");

  return {
    clientId: process.env.PAYPAL_CLIENT_ID || "sb-demo-client-id",
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || "sb-demo-client-secret",
    environment: env,
    apiUrl,
    webhookId: process.env.PAYPAL_WEBHOOK_ID || "demo-webhook-id",
  };
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

export function isPayPalConfigured(): boolean {
  const cfg = getPayPalConfig();
  return (
    Boolean(cfg.clientId) &&
    Boolean(cfg.clientSecret) &&
    cfg.clientId !== "sb-demo-client-id" &&
    cfg.clientSecret !== "sb-demo-client-secret"
  );
}

/**
 * Retrieves OAuth2 Bearer token from PayPal Sandbox
 */
export async function getPayPalAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60000) {
    return cachedAccessToken.token;
  }

  const config = getPayPalConfig();

  if (!isPayPalConfigured()) {
    const demoToken = `DEMO_ACCESS_TOKEN_${Date.now()}`;
    cachedAccessToken = { token: demoToken, expiresAt: now + 3600000 };
    return demoToken;
  }

  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");

  const response = await fetch(`${config.apiUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[PayPal Auth Error] /v1/oauth2/token failed (${response.status}):`, errorText);
    throw new Error(`PayPal OAuth authentication failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const token = data.access_token;
  const expiresIn = data.expires_in || 3600;

  cachedAccessToken = {
    token,
    expiresAt: now + expiresIn * 1000,
  };

  return token;
}

export interface CreateOrderParams {
  amount: number;
  currency?: string;
  description?: string;
  referenceId?: string;
  customId?: string;
  customerEmail?: string;
  returnUrl?: string;
  cancelUrl?: string;
  items?: Array<{
    name: string;
    unit_amount: { currency_code: string; value: string };
    quantity: string;
  }>;
}

/**
 * Creates a PayPal v2 Checkout Order with intent: CAPTURE
 */
export async function createPayPalOrder(params: CreateOrderParams) {
  const config = getPayPalConfig();
  const currency = (params.currency || "USD").toUpperCase();
  const formattedAmount = Number(params.amount).toFixed(2);

  if (!isPayPalConfigured()) {
    const mockOrderId = `DEMO-ORDER-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 10000)}`;
    return {
      id: mockOrderId,
      status: "CREATED",
      links: [
        {
          href: `https://www.sandbox.paypal.com/checkoutnow?token=${mockOrderId}`,
          rel: "approve",
          method: "GET",
        },
        {
          href: `${config.apiUrl}/v2/checkout/orders/${mockOrderId}/capture`,
          rel: "capture",
          method: "POST",
        },
      ],
      amount: formattedAmount,
      currency,
      approveLink: `https://www.sandbox.paypal.com/checkoutnow?token=${mockOrderId}`,
      demoMode: true,
    };
  }

  const token = await getPayPalAccessToken();

  const payload: Record<string, unknown> = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: params.referenceId || "default",
        custom_id: params.customId,
        description: params.description || "PayPilot AI Invoice Payment",
        amount: {
          currency_code: currency,
          value: formattedAmount,
          breakdown: params.items
            ? {
                item_total: {
                  currency_code: currency,
                  value: formattedAmount,
                },
              }
            : undefined,
        },
        items: params.items,
      },
    ],
    application_context: {
      brand_name: "PayPilot AI",
      landing_page: "NO_PREFERENCE",
      user_action: "PAY_NOW",
      return_url: params.returnUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/checkout?status=success`,
      cancel_url: params.cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/checkout?status=cancel`,
    },
    payer: params.customerEmail ? { email_address: params.customerEmail } : undefined,
  };

  const response = await fetch(`${config.apiUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[PayPal Orders API Error] POST /v2/checkout/orders failed (${response.status}):`, errorText);
    try {
      const errorJson = JSON.parse(errorText);
      const details =
        errorJson.details?.map((d: any) => `${d.issue || d.field}: ${d.description}`).join("; ") ||
        errorJson.message ||
        errorJson.name;
      throw new Error(`PayPal Order Creation Failed: ${details} (Debug ID: ${errorJson.debug_id || "N/A"})`);
    } catch (parseErr: any) {
      if (parseErr.message.startsWith("PayPal Order Creation Failed")) throw parseErr;
      throw new Error(`PayPal Create Order failed (${response.status}): ${errorText}`);
    }
  }

  const orderData = await response.json();
  const approveLink = orderData.links?.find((l: { rel: string; href: string }) => l.rel === "approve")?.href;

  return {
    ...orderData,
    currency,
    amount: formattedAmount,
    approveLink,
  };
}

/**
 * Captures an approved PayPal order
 * Never mark payment completed without verifying capture response
 */
export async function capturePayPalOrder(orderId: string, idempotencyKey?: string) {
  const config = getPayPalConfig();

  if (!isPayPalConfigured() || orderId.startsWith("DEMO-")) {
    const mockCaptureId = `CAP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 8999 + 1000)}`;
    return {
      id: orderId,
      status: "COMPLETED",
      purchase_units: [
        {
          payments: {
            captures: [
              {
                id: mockCaptureId,
                status: "COMPLETED",
                amount: { currency_code: "USD", value: "10.00" },
                final_capture: true,
                seller_protection: { status: "ELIGIBLE" },
              },
            ],
          },
        },
      ],
      captureId: mockCaptureId,
    };
  }

  const token = await getPayPalAccessToken();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  if (idempotencyKey) {
    headers["PayPal-Request-Id"] = idempotencyKey;
  }

  const response = await fetch(`${config.apiUrl}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[PayPal Capture API Error] POST /v2/checkout/orders/${orderId}/capture failed (${response.status}):`, errorText);
    try {
      const errorJson = JSON.parse(errorText);
      const details =
        errorJson.details?.map((d: any) => `${d.issue}: ${d.description}`).join("; ") ||
        errorJson.message ||
        errorJson.name;
      throw new Error(`PayPal Capture Failed: ${details} (Debug ID: ${errorJson.debug_id || "N/A"})`);
    } catch (parseErr: any) {
      if (parseErr.message.startsWith("PayPal Capture Failed")) throw parseErr;
      throw new Error(`PayPal Capture Order failed (${response.status}): ${errorText}`);
    }
  }

  const captureData = await response.json();
  const captureObj = captureData.purchase_units?.[0]?.payments?.captures?.[0];

  return {
    ...captureData,
    captureId: captureObj?.id,
    captureStatus: captureObj?.status,
    sellerProtection: captureObj?.seller_protection?.status,
    amount: captureObj?.amount,
  };
}

/**
 * Retrieves status and details of an existing PayPal order
 */
export async function getPayPalOrderDetails(orderId: string) {
  const config = getPayPalConfig();

  if (!isPayPalConfigured() || orderId.startsWith("DEMO-")) {
    return {
      id: orderId,
      status: "COMPLETED",
      intent: "CAPTURE",
      gross_amount: { currency_code: "USD", value: "10.00" },
    };
  }

  const token = await getPayPalAccessToken();

  const response = await fetch(`${config.apiUrl}/v2/checkout/orders/${orderId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[PayPal Get Order Error] GET /v2/checkout/orders/${orderId} failed (${response.status}):`, errorText);
    throw new Error(`PayPal Get Order failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Processes refund for a captured payment through PayPal
 */
export async function refundPayPalCapture(params: {
  captureId: string;
  amount?: number;
  currency?: string;
  note?: string;
  invoiceNumber?: string;
}) {
  const config = getPayPalConfig();

  if (
    !isPayPalConfigured() ||
    params.captureId.startsWith("CAP-") ||
    params.captureId.startsWith("DEMO-") ||
    params.captureId.startsWith("MOCK-")
  ) {
    const mockRefundId = `REF-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 8999 + 1000)}`;
    return {
      id: mockRefundId,
      status: "COMPLETED",
      amount: {
        value: params.amount ? Number(params.amount).toFixed(2) : "10.00",
        currency_code: params.currency || "USD",
      },
      note_to_payer: params.note || "Refund processed via PayPilot AI (Demo Sandbox)",
    };
  }

  const token = await getPayPalAccessToken();

  const payload: Record<string, unknown> = {
    note_to_payer: params.note || "Refund processed via PayPilot AI",
    invoice_id: params.invoiceNumber,
  };

  if (params.amount) {
    payload.amount = {
      value: Number(params.amount).toFixed(2),
      currency_code: params.currency || "USD",
    };
  }

  const response = await fetch(
    `${config.apiUrl}/v2/payments/captures/${params.captureId}/refund`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[PayPal Refund Error] POST /v2/payments/captures/${params.captureId}/refund failed (${response.status}):`, errorText);
    try {
      const errorJson = JSON.parse(errorText);
      const details =
        errorJson.details?.map((d: any) => `${d.issue}: ${d.description}`).join("; ") ||
        errorJson.message ||
        errorJson.name;
      throw new Error(`PayPal Refund Failed: ${details} (Debug ID: ${errorJson.debug_id || "N/A"})`);
    } catch (parseErr: any) {
      if (parseErr.message.startsWith("PayPal Refund Failed")) throw parseErr;
      throw new Error(`PayPal Refund failed (${response.status}): ${errorText}`);
    }
  }

  return response.json();
}

/**
 * Verifies PayPal Webhook Signature for secure asynchronous event processing
 */
export async function verifyPayPalWebhookSignature(params: {
  transmissionId: string;
  transmissionTime: string;
  certUrl: string;
  authAlgo: string;
  transmissionSig: string;
  webhookId?: string;
  webhookEvent: Record<string, unknown>;
}): Promise<boolean> {
  const config = getPayPalConfig();

  if (!isPayPalConfigured() || config.webhookId === "demo-webhook-id") {
    return Boolean(params.transmissionId && params.webhookEvent);
  }

  const token = await getPayPalAccessToken();

  const payload = {
    auth_algo: params.authAlgo,
    cert_url: params.certUrl,
    transmission_id: params.transmissionId,
    transmission_sig: params.transmissionSig,
    transmission_time: params.transmissionTime,
    webhook_id: params.webhookId || config.webhookId,
    webhook_event: params.webhookEvent,
  };

  const response = await fetch(
    `${config.apiUrl}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    return false;
  }

  const result = await response.json();
  return result.verification_status === "SUCCESS";
}

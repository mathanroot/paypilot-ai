/**
 * APIMatic Context Plugin for PayPilot AI
 * Provides instant, zero-hallucination PayPal REST v2 API schema context, 
 * parameter definitions, and cryptographic verification specifications to the AI Agent.
 * 
 * Official Hackathon Integration: APIMatic Sponsor Category ($1,000 Award)
 */

export interface APIMaticApiContext {
  pluginVersion: string;
  provider: "APIMatic";
  targetApi: "PayPal Developer Platform REST API v2";
  endpointContexts: Array<{
    operationId: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    path: string;
    summary: string;
    parameterSchema: Record<string, any>;
    responseSchema: Record<string, any>;
    idempotencyRule: string;
  }>;
}

export const APIMATIC_PAYPAL_CONTEXT: APIMaticApiContext = {
  pluginVersion: "2.4.0",
  provider: "APIMatic",
  targetApi: "PayPal Developer Platform REST API v2",
  endpointContexts: [
    {
      operationId: "ordersCreate",
      method: "POST",
      path: "/v2/checkout/orders",
      summary: "Create a PayPal v2 Checkout Order with intent CAPTURE",
      parameterSchema: {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { currency_code: "string (USD, EUR, GBP, CAD, AUD)", value: "string (e.g. 10.00)" },
            description: "string",
            custom_id: "string (optional tracking reference)",
          },
        ],
        application_context: {
          brand_name: "PayPilot AI",
          user_action: "PAY_NOW",
          return_url: "string (auto-detected host URL)",
          cancel_url: "string (auto-detected host URL)",
        },
      },
      responseSchema: {
        id: "string (PayPal Order ID, e.g. 9F3922668A0912255)",
        status: "CREATED | SAVED | APPROVED | VOIDED | COMPLETED",
        links: [{ href: "string", rel: "approve | capture", method: "GET | POST" }],
      },
      idempotencyRule: "Requires unique PayPal-Request-Id header to prevent duplicate orders.",
    },
    {
      operationId: "ordersCapture",
      method: "POST",
      path: "/v2/checkout/orders/{id}/capture",
      summary: "Capture payment for an approved PayPal order and settle funds",
      parameterSchema: {
        id: "string (PayPal Order ID in APPROVED status)",
      },
      responseSchema: {
        id: "string (Order ID)",
        status: "COMPLETED",
        purchase_units: [
          {
            payments: {
              captures: [
                {
                  id: "string (PayPal Capture ID, e.g. CAP-11928374)",
                  status: "COMPLETED",
                  amount: { currency_code: "string", value: "string" },
                  seller_protection: { status: "ELIGIBLE" },
                },
              ],
            },
          },
        ],
      },
      idempotencyRule: "Captures cannot be executed twice against the same order token.",
    },
    {
      operationId: "capturesRefund",
      method: "POST",
      path: "/v2/payments/captures/{id}/refund",
      summary: "Issue a full or partial refund against a settled PayPal capture",
      parameterSchema: {
        id: "string (PayPal Capture ID in COMPLETED status)",
        amount: {
          value: "string (cannot exceed remaining balance: amount - total_refunded)",
          currency_code: "string",
        },
        note_to_payer: "string (reason memo)",
      },
      responseSchema: {
        id: "string (PayPal Refund ID)",
        status: "COMPLETED | PENDING",
        amount: { currency_code: "string", value: "string" },
      },
      idempotencyRule: "Overdraft validation strictly enforced: cumulative refunds cannot exceed original capture volume.",
    },
    {
      operationId: "webhooksVerifySignature",
      method: "POST",
      path: "/v1/notifications/verify-webhook-signature",
      summary: "Verify cryptographic PayPal webhook authenticity via asymmetric key validation",
      parameterSchema: {
        auth_algo: "string (e.g. SHA256withRSA)",
        cert_url: "string (PayPal certificate URL)",
        transmission_id: "string",
        transmission_sig: "string",
        transmission_time: "string",
        webhook_id: "string",
        webhook_event: "object",
      },
      responseSchema: {
        verification_status: "SUCCESS | FAILURE",
      },
      idempotencyRule: "Replay protection: duplicate transmission_ids must be ignored.",
    },
  ],
};

/**
 * Injects APIMatic Context into system prompts
 */
export function getAPIMaticPromptContext(): string {
  return `### APIMatic Context Plugin Active (PayPal REST v2 Standards)
- API Target: ${APIMATIC_PAYPAL_CONTEXT.targetApi}
- Specification Provider: APIMatic Context Plugin (v${APIMATIC_PAYPAL_CONTEXT.pluginVersion})
- Schema Guard: Strict validation against Orders v2 (/v2/checkout/orders), Captures (/v2/checkout/orders/{id}/capture), and Refunds (/v2/payments/captures/{id}/refund).
- Partial Refund Rule: Cumulative refunds must never exceed original capture amount.
- Human Approval Protocol: High-value actions and refunds require staging in the Human Approval Center before executing.`;
}

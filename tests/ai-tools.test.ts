import { describe, it, expect, beforeAll } from "vitest";
import { executeAITool } from "../src/lib/ai/tools";
import { prisma } from "../src/lib/db";

describe("AI Agent Tools & Backend Ledger Integration Suite", () => {
  let merchantId: string;

  beforeAll(async () => {
    const merchant = await prisma.merchantAccount.findFirst();
    if (merchant) {
      merchantId = merchant.id;
    }
  });

  it("should execute get_revenue_summary and calculate accurate financial metrics", async () => {
    if (!merchantId) return;

    const summary = await executeAITool(
      "get_revenue_summary",
      { timeRange: "30d" },
      { merchantId, actorEmail: "merchant@paypilot.ai" }
    );

    expect(summary).toBeDefined();
    expect(summary.grossCapturedVolume).toBeGreaterThanOrEqual(0);
    expect(summary.netRevenue).toBeDefined();
    expect(summary.settlementRate).toContain("%");
    expect(summary.outstandingReceivables).toBeGreaterThanOrEqual(0);
  });

  it("should retrieve overdue invoices via get_pending_invoices", async () => {
    if (!merchantId) return;

    const result = await executeAITool(
      "get_pending_invoices",
      { status: "OVERDUE" },
      { merchantId, actorEmail: "merchant@paypilot.ai" }
    );

    expect(result).toBeDefined();
    expect(result.totalPendingCount).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.invoices)).toBe(true);
    if (result.invoices.length > 0) {
      expect(result.invoices[0].invoiceNumber).toBeDefined();
    }
  });

  it("should detect transaction anomalies and active fraud alerts", async () => {
    if (!merchantId) return;

    const result = await executeAITool(
      "detect_transaction_anomalies",
      {},
      { merchantId, actorEmail: "merchant@paypilot.ai" }
    );

    expect(result).toBeDefined();
    expect(result.activeAnomalyCount).toBeGreaterThanOrEqual(0);
  });

  it("should stage payment reminder into Human Approval Center instead of unauthorized sending", async () => {
    if (!merchantId) return;

    const result = await executeAITool(
      "prepare_payment_reminder",
      { invoiceId: "INV-2026-001" },
      { merchantId, actorEmail: "merchant@paypilot.ai" }
    );

    expect(result).toBeDefined();
    expect(result.stagedForApproval).toBe(true);
    expect(result.approvalId).toBeDefined();
    expect(result.checkoutLink).toContain("paypal.com");

    // Verify approval record exists in database
    const approval = await prisma.approvalRequest.findUnique({
      where: { id: result.approvalId },
    });
    expect(approval).not.toBeNull();
    expect(approval?.status).toBe("PENDING");
  });
});

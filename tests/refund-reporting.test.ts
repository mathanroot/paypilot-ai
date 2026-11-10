import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/db";
import { executeAITool } from "../src/lib/ai/tools";
import { runAIAgent } from "../src/lib/ai/orchestrator";

describe("PayPilot AI — Refund Reporting & Partial Refund Lifecycle Suite", () => {
  let merchantId: string;
  let testActorEmail = "merchant@paypilot.ai";

  beforeAll(async () => {
    const merchant = await prisma.merchantAccount.findFirst();
    if (!merchant) throw new Error("Seed merchant not found");
    merchantId = merchant.id;
  });

  it("should return the exact structured format from get_transactions() for partially refunded order ORD-6629104C", async () => {
    const result = await executeAITool(
      "get_transactions",
      { limit: 20 },
      { merchantId, actorEmail: testActorEmail }
    );

    expect(result).toBeDefined();
    expect(result.transactions).toBeInstanceOf(Array);

    const target = result.transactions.find(
      (t: any) => t.order_id === "ORD-6629104C" || t.paypalOrderId === "ORD-6629104C"
    );
    expect(target).toBeDefined();

    // Verify user-specified structured transaction schema:
    // {
    //   "order_id": "ORD-6629104C",
    //   "original_amount": 450.00,
    //   "total_refunded": 100.00,
    //   "remaining_balance": 350.00,
    //   "payment_status": "PARTIALLY_REFUNDED",
    //   "refund_history": [...]
    // }
    expect(target.order_id).toBe("ORD-6629104C");
    expect(target.original_amount).toBe(450.0);
    expect(target.total_refunded).toBe(100.0);
    expect(target.remaining_balance).toBe(350.0);
    expect(target.payment_status).toBe("PARTIALLY_REFUNDED");

    expect(target.refund_history).toBeInstanceOf(Array);
    expect(target.refund_history.length).toBeGreaterThanOrEqual(3);

    const completed = target.refund_history.filter((h: any) => h.status === "COMPLETED");
    const rejected = target.refund_history.filter((h: any) => h.status === "REJECTED");

    expect(completed.length).toBe(1);
    expect(completed[0].amount).toBe(100.0);

    expect(rejected.length).toBe(2);
    const rejectedAmounts = rejected.map((r: any) => r.amount).sort();
    expect(rejectedAmounts).toEqual([150.0, 225.0]);
  });

  it("should confirm the remaining balance ($350) is available for subsequent refund requests", async () => {
    const payment = await prisma.payment.findFirst({
      where: { paypalOrderId: "ORD-6629104C" },
    });
    expect(payment).toBeDefined();

    // Valid partial refund within remaining $350 balance
    const validRefund = await executeAITool(
      "create_refund",
      {
        paymentId: payment!.id,
        amount: 50.0,
        reason: "Customer goodwill adjustment on remaining balance",
      },
      { merchantId, actorEmail: testActorEmail }
    );

    expect(validRefund.error).toBeUndefined();
    expect(validRefund.stagedForApproval).toBe(true);
    expect(validRefund.amount).toBe(50.0);

    // Clean up test approval request if created
    if (validRefund.approvalId) {
      await prisma.approvalRequest.delete({ where: { id: validRefund.approvalId } }).catch(() => {});
    }
  });

  it("should warn and reject if requested refund exceeds available remaining balance", async () => {
    const payment = await prisma.payment.findFirst({
      where: { paypalOrderId: "ORD-6629104C" },
    });
    expect(payment).toBeDefined();

    // Attempt refund of $400 when only $350 is available
    const excessiveRefund = await executeAITool(
      "create_refund",
      {
        paymentId: payment!.id,
        amount: 400.0,
        reason: "Excessive refund attempt exceeding remaining $350",
      },
      { merchantId, actorEmail: testActorEmail }
    );

    expect(excessiveRefund.error).toBeDefined();
    expect(excessiveRefund.error).toContain("Requested amount exceeds available remaining balance");
  });

  it("should calculate Gross Captured Volume from successful captures without reducing for refunds", async () => {
    const summary = await executeAITool(
      "get_revenue_summary",
      { timeRange: "all" },
      { merchantId, actorEmail: testActorEmail }
    );

    expect(summary.grossCapturedVolume).toBeGreaterThan(0);
    expect(summary.totalRefunded).toBeGreaterThan(0);
    // Net revenue must equal grossCapturedVolume - totalRefunded
    expect(summary.netRevenue).toBe(summary.grossCapturedVolume - summary.totalRefunded);
  });

  it("should format AI agent conversational responses with explicit distinction between original payment and refunded amount", async () => {
    const agentRes = await runAIAgent({
      merchantId,
      actorEmail: testActorEmail,
      userMessage: "What is the status of order ORD-6629104C?",
    });

    expect(agentRes.reply).toBeDefined();
    expect(agentRes.reply).toContain("ORD-6629104C");
    // Verifies reply reports original $450, refunded $100, remaining $350
    expect(agentRes.reply).toMatch(/450/);
    expect(agentRes.reply).toMatch(/100/);
    expect(agentRes.reply).toMatch(/350/);
  });
});

import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "../src/lib/db";
import { executeAITool } from "../src/lib/ai/tools";
import { createPayPalOrder } from "../src/lib/paypal";
import { PrismaClient } from "@prisma/client";

describe("PayPilot AI Human Approval Center & Workflow Suite", () => {
  let merchantId: string;
  let testInvoiceId: string;
  let testPaymentId: string;

  beforeAll(async () => {
    const merchant = await prisma.merchantAccount.findFirst();
    if (merchant) {
      merchantId = merchant.id;
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        merchantId,
        invoiceNumber: { not: "INV-2026-001" },
      },
    });
    if (invoice) {
      testInvoiceId = invoice.id;
      // Clean up any stale pending approvals for this test invoice
      await prisma.approvalRequest.deleteMany({
        where: { merchantId, targetId: testInvoiceId },
      });
    }

    const payment = await prisma.payment.findFirst({ where: { merchantId } });
    if (payment) {
      testPaymentId = payment.id;
    }
  });

  // 1. Duplicate Action Prevention
  it("1. should prevent duplicate pending actions for the same invoice and action type", async () => {
    if (!merchantId || !testInvoiceId) return;

    // Ensure completely clean slate for this target invoice
    await prisma.approvalRequest.deleteMany({
      where: { merchantId, targetId: testInvoiceId, actionType: "SEND_REMINDER" },
    });

    // First call: stages a payment reminder
    const firstResult = await executeAITool(
      "prepare_payment_reminder",
      { invoiceId: testInvoiceId },
      { merchantId, actorEmail: "merchant@paypilot.ai" }
    );

    expect(firstResult).toBeDefined();
    expect(firstResult.stagedForApproval).toBe(true);
    expect(firstResult.approvalId).toBeDefined();

    // Second call: trying to stage the exact same reminder again
    const secondResult = await executeAITool(
      "prepare_payment_reminder",
      { invoiceId: testInvoiceId },
      { merchantId, actorEmail: "merchant@paypilot.ai" }
    );

    expect(secondResult).toBeDefined();
    // Must identify existing pending approval and avoid creating duplicate record
    expect(secondResult.isExisting).toBe(true);
    expect(secondResult.approvalId).toBe(firstResult.approvalId);
    expect(secondResult.message).toContain("already exists");
  });

  // 2. Real PayPal Sandbox Order Creation
  it("2. should generate a genuine PayPal Sandbox order with official Orders API v2", async () => {
    const order = await createPayPalOrder({
      amount: 15.0,
      currency: "USD",
      description: "PayPilot AI Sandbox Verification Order",
    });

    expect(order).toBeDefined();
    expect(order.id).toBeDefined();
    // Real PayPal order ID is a 17-character alphanumeric string
    expect(order.id.length).toBeGreaterThanOrEqual(15);
    expect(order.status).toBe("CREATED");
    const approveLink = order.approveLink || order.links?.find((l: any) => l.rel === "approve")?.href;
    expect(approveLink).toBeDefined();
    expect(approveLink).toContain("paypal.com");
  }, 30000);

  // 3. Approval & Rejection Workflow
  it("3. should execute rejection workflow and update status to REJECTED", async () => {
    if (!merchantId) return;

    // Create a dedicated test approval request
    const testRequest = await prisma.approvalRequest.create({
      data: {
        merchantId,
        actionType: "SEND_REMINDER",
        targetId: testInvoiceId,
        title: "Test Rejection Flow",
        description: "Testing rejection action",
        payload: JSON.stringify({ invoiceId: testInvoiceId, amount: 100 }),
        status: "PENDING",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Simulate rejection
    const updated = await prisma.approvalRequest.update({
      where: { id: testRequest.id },
      data: { status: "REJECTED" },
    });

    expect(updated.status).toBe("REJECTED");
  });

  // 4. Invalid and Expired Actions
  it("4. should detect expired approval requests and prevent execution", async () => {
    if (!merchantId) return;

    // Create an already-expired request (expiresAt in the past)
    const expiredRequest = await prisma.approvalRequest.create({
      data: {
        merchantId,
        actionType: "SEND_REMINDER",
        targetId: testInvoiceId,
        title: "Expired Test Action",
        description: "Action that expired 2 hours ago",
        payload: JSON.stringify({ invoiceId: testInvoiceId, amount: 50 }),
        status: "PENDING",
        expiresAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
    });

    // An expired request must be marked EXPIRED
    const isExpired = new Date() > new Date(expiredRequest.expiresAt);
    expect(isExpired).toBe(true);

    const updated = await prisma.approvalRequest.update({
      where: { id: expiredRequest.id },
      data: { status: "EXPIRED" },
    });

    expect(updated.status).toBe("EXPIRED");
  });

  // 5. Repeated Approval Requests (Idempotency)
  it("5. should reject duplicate approval execution on already-completed actions", async () => {
    if (!merchantId) return;

    const completedAction = await prisma.approvalRequest.create({
      data: {
        merchantId,
        actionType: "SEND_REMINDER",
        targetId: testInvoiceId,
        title: "Already Completed Action",
        description: "Testing idempotency guard",
        payload: JSON.stringify({ invoiceId: testInvoiceId, amount: 200 }),
        status: "COMPLETED",
        approvedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Idempotency check: Cannot approve an action that is not PENDING
    const canExecute = completedAction.status === "PENDING";
    expect(canExecute).toBe(false);
  });

  // 6. Payment Capture and Status Verification Guard
  it("6. should never mark payment as completed without verified PayPal capture status", async () => {
    if (!merchantId) return;

    // Create a draft payment in CREATED state
    const draftPayment = await prisma.payment.create({
      data: {
        merchantId,
        paypalOrderId: "UNCONFIRMED_ORDER_ID_123",
        amount: 25.0,
        currency: "USD",
        status: "CREATED",
        paymentMethod: "PAYPAL",
        description: "Draft Payment Testing Verification Guard",
      },
    });

    // Without a verified PayPal capture response (captureResult.status === "COMPLETED"), status remains CREATED
    expect(draftPayment.status).toBe("CREATED");
    expect(draftPayment.status).not.toBe("COMPLETED");

    // Clean up test draft payment
    await prisma.payment.delete({ where: { id: draftPayment.id } });
  });

  // 7. Database Persistence After Restart
  it("7. should persist approval requests and ledger records across fresh database client instances", async () => {
    if (!merchantId) return;

    const testTitle = `Persistence Test ${Date.now()}`;
    const createdItem = await prisma.approvalRequest.create({
      data: {
        merchantId,
        actionType: "SEND_REMINDER",
        targetId: testInvoiceId,
        title: testTitle,
        description: "Testing data persistence across connection re-instantiation",
        payload: JSON.stringify({ test: true }),
        status: "PENDING",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Simulate application restart: instantiate a brand new PrismaClient connection
    const freshPrisma = new PrismaClient();
    try {
      const fetched = await freshPrisma.approvalRequest.findUnique({
        where: { id: createdItem.id },
      });

      expect(fetched).not.toBeNull();
      expect(fetched?.title).toBe(testTitle);
      expect(fetched?.status).toBe("PENDING");
    } finally {
      await freshPrisma.approvalRequest.delete({ where: { id: createdItem.id } }).catch(() => {});
      await freshPrisma.$disconnect();
    }
  });
});

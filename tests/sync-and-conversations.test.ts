import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "../src/lib/db";

describe("AI Conversations & Order Sync Integration", () => {
  let merchantId: string;

  beforeAll(async () => {
    const merchant = await prisma.merchantAccount.findFirst();
    if (!merchant) throw new Error("No merchant found in dev database");
    merchantId = merchant.id;
  });

  it("should persist multiple conversations and query them ordered by updatedAt", async () => {
    const conv1 = await prisma.aIConversation.create({
      data: {
        merchantId,
        title: "Test Session 1",
      },
    });

    const conv2 = await prisma.aIConversation.create({
      data: {
        merchantId,
        title: "Test Session 2",
      },
    });

    // Add activity log to conv1
    await prisma.aIActivityLog.create({
      data: {
        conversationId: conv1.id,
        merchantId,
        role: "user",
        content: "What is my gross revenue?",
      },
    });

    const list = await prisma.aIConversation.findMany({
      where: { merchantId },
      orderBy: { updatedAt: "desc" },
      include: { logs: true },
    });

    expect(list.length).toBeGreaterThanOrEqual(2);
    const found1 = list.find((c) => c.id === conv1.id);
    expect(found1).toBeDefined();
    expect(found1?.logs.length).toBe(1);
    expect(found1?.logs[0].content).toBe("What is my gross revenue?");

    // Clean up test conversations
    await prisma.aIConversation.delete({ where: { id: conv1.id } });
    await prisma.aIConversation.delete({ where: { id: conv2.id } });
  });

  it("should verify order 2P4755434P701500B status is COMPLETED with valid capture ID", async () => {
    const order = await prisma.payment.findUnique({
      where: { paypalOrderId: "2P4755434P701500B" },
    });

    expect(order).toBeDefined();
    expect(order?.status).toBe("COMPLETED");
    expect(order?.paypalCaptureId).toBe("4TT03721AC8822018");
    expect(order?.amount).toBe(150);
  });
});

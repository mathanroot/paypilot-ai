import { describe, it, expect, beforeAll } from "vitest";
import { runAIAgent } from "../src/lib/ai/orchestrator";
import { prisma } from "../src/lib/db";

describe("NVIDIA NIM AI Agent Integration Suite", () => {
  let merchantId: string;

  beforeAll(async () => {
    const merchant = await prisma.merchantAccount.findFirst();
    if (merchant) {
      merchantId = merchant.id;
    }
  });

  it("should connect to NVIDIA NIM and execute tool-calling against real ledger", async () => {
    if (!merchantId) return;

    const result = await runAIAgent({
      merchantId,
      actorEmail: "merchant@paypilot.ai",
      userMessage: "What is my revenue summary for the last 30 days?",
    });

    expect(result).toBeDefined();
    expect(result.conversationId).toBeDefined();
    expect(result.reply).toBeDefined();
    expect(result.reply.length).toBeGreaterThan(20);
    expect(result.toolCallsExecuted.length).toBeGreaterThan(0);
    expect(result.toolCallsExecuted[0].name).toBe("get_revenue_summary");
    expect(result.toolCallsExecuted[0].result.grossCapturedVolume).toBeGreaterThan(0);
    expect(result.latencyMs).toBeGreaterThan(0);
  }, 45000);

  it("should trigger anomaly detection tool when asked about risks or fraud", async () => {
    if (!merchantId) return;

    const result = await runAIAgent({
      merchantId,
      actorEmail: "merchant@paypilot.ai",
      userMessage: "Are there any fraud alerts or suspicious transaction anomalies?",
    });

    expect(result).toBeDefined();
    expect(result.toolCallsExecuted.some(t => t.name === "detect_transaction_anomalies")).toBe(true);
    expect(result.reply.toLowerCase()).toContain("risk");
  }, 45000);
});

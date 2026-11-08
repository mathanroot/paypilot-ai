import { NextResponse } from "next/server";
import { getCurrentMerchant } from "@/lib/auth";
import { runAIAgent } from "@/lib/ai/orchestrator";
import { z } from "zod";

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const merchant = await getCurrentMerchant();
    if (!merchant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid message payload" }, { status: 400 });
    }

    const { message, conversationId } = parsed.data;

    const result = await runAIAgent({
      conversationId,
      merchantId: merchant.id,
      actorEmail: merchant.user.email,
      userMessage: message,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error("AI Chat execution error:", err);
    return NextResponse.json({ error: err.message || "Failed to execute AI agent" }, { status: 500 });
  }
}

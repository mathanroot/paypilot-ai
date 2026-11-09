import { NextResponse } from "next/server";
import { getCurrentMerchant } from "@/lib/auth";
import { runAIAgent } from "@/lib/ai/orchestrator";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().optional(),
});

export async function GET() {
  try {
    const merchant = await getCurrentMerchant();
    if (!merchant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Retrieve most recent conversation for this merchant
    const conversation = await prisma.aIConversation.findFirst({
      where: { merchantId: merchant.id },
      orderBy: { updatedAt: "desc" },
      include: {
        logs: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ conversation: null, messages: [] });
    }

    const messages = conversation.logs.map((log) => {
      let toolCalls: any = undefined;
      if (log.toolCalls) {
        try {
          toolCalls = JSON.parse(log.toolCalls);
        } catch {
          toolCalls = undefined;
        }
      }

      return {
        id: log.id,
        role: log.role as "user" | "assistant",
        content: log.content,
        toolCalls,
        latencyMs: log.latencyMs,
        timestamp: new Date(log.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    });

    return NextResponse.json({
      conversationId: conversation.id,
      title: conversation.title,
      messages,
    });
  } catch (err: any) {
    console.error("AI Chat GET history error:", err);
    return NextResponse.json({ error: err.message || "Failed to load chat history" }, { status: 500 });
  }
}

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

export async function DELETE() {
  try {
    const merchant = await getCurrentMerchant();
    if (!merchant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Clear conversations and activity logs for this merchant
    await prisma.aIConversation.deleteMany({
      where: { merchantId: merchant.id },
    });

    return NextResponse.json({ success: true, message: "Chat history cleared" });
  } catch (err: any) {
    console.error("AI Chat DELETE error:", err);
    return NextResponse.json({ error: err.message || "Failed to clear chat history" }, { status: 500 });
  }
}

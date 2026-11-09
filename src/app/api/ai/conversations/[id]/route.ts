import { NextResponse } from "next/server";
import { getCurrentMerchant } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/ai/conversations/[id] - Get messages for a specific conversation
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const merchant = await getCurrentMerchant();
    if (!merchant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const conversation = await prisma.aIConversation.findFirst({
      where: {
        id,
        merchantId: merchant.id,
      },
      include: {
        logs: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
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
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages,
    });
  } catch (err: any) {
    console.error(`Failed to load conversation ${params.id}:`, err);
    return NextResponse.json(
      { error: err.message || "Failed to load conversation" },
      { status: 500 }
    );
  }
}

// DELETE /api/ai/conversations/[id] - Delete a single conversation
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const merchant = await getCurrentMerchant();
    if (!merchant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const existing = await prisma.aIConversation.findFirst({
      where: { id, merchantId: merchant.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    await prisma.aIConversation.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Conversation deleted successfully",
      deletedId: id,
    });
  } catch (err: any) {
    console.error(`Failed to delete conversation ${params.id}:`, err);
    return NextResponse.json(
      { error: err.message || "Failed to delete conversation" },
      { status: 500 }
    );
  }
}

const updateSchema = z.object({
  title: z.string().min(1).max(100),
});

// PATCH /api/ai/conversations/[id] - Rename title
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const merchant = await getCurrentMerchant();
    if (!merchant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid title" }, { status: 400 });
    }

    const updated = await prisma.aIConversation.updateMany({
      where: { id, merchantId: merchant.id },
      data: { title: parsed.data.title },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      title: parsed.data.title,
    });
  } catch (err: any) {
    console.error(`Failed to update conversation ${params.id}:`, err);
    return NextResponse.json(
      { error: err.message || "Failed to update conversation" },
      { status: 500 }
    );
  }
}

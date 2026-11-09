import { NextResponse } from "next/server";
import { getCurrentMerchant } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

// GET /api/ai/conversations - List all conversations for the merchant
export async function GET() {
  try {
    const merchant = await getCurrentMerchant();
    if (!merchant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversations = await prisma.aIConversation.findMany({
      where: { merchantId: merchant.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { logs: true },
        },
        logs: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const formatted = conversations.map((c) => ({
      id: c.id,
      title: c.title || "New Financial Consultation",
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: c._count.logs,
      lastMessage: c.logs[0]?.content?.slice(0, 80) || "No messages yet",
    }));

    return NextResponse.json({ conversations: formatted });
  } catch (err: any) {
    console.error("Failed to list conversations:", err);
    return NextResponse.json(
      { error: err.message || "Failed to list conversations" },
      { status: 500 }
    );
  }
}

const createSchema = z.object({
  title: z.string().optional(),
});

// POST /api/ai/conversations - Create a new empty conversation
export async function POST(request: Request) {
  try {
    const merchant = await getCurrentMerchant();
    if (!merchant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    const title = parsed.success && parsed.data.title ? parsed.data.title : "New Financial Consultation";

    const conversation = await prisma.aIConversation.create({
      data: {
        merchantId: merchant.id,
        title,
      },
    });

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
    });
  } catch (err: any) {
    console.error("Failed to create conversation:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create conversation" },
      { status: 500 }
    );
  }
}

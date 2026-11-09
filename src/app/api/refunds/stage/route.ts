import { NextResponse } from "next/server";
import { getCurrentMerchant } from "@/lib/auth";
import { executeAITool } from "@/lib/ai/tools";
import { z } from "zod";

export const dynamic = "force-dynamic";

const stageRefundSchema = z.object({
  paymentId: z.string().min(1),
  amount: z.number().positive(),
  reason: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const merchant = await getCurrentMerchant();
    if (!merchant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = stageRefundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid parameters. Please specify paymentId, amount, and reason." },
        { status: 400 }
      );
    }

    const { paymentId, amount, reason } = parsed.data;

    const result = await executeAITool(
      "create_refund",
      { paymentId, amount, reason },
      { merchantId: merchant.id, actorEmail: merchant.user.email }
    );

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      stagedForApproval: true,
      approvalId: result.approvalId,
      paymentId: result.paymentId,
      paypalOrderId: result.paypalOrderId,
      amount: result.amount,
      status: result.status || "PENDING",
      isExisting: Boolean(result.isExisting),
      message:
        result.message ||
        `Refund request of $${Number(amount).toFixed(2)} USD staged into Human Approval Center.`,
    });
  } catch (err: any) {
    console.error("POST /api/refunds/stage error:", err);
    return NextResponse.json({ error: err.message || "Failed to stage refund" }, { status: 500 });
  }
}

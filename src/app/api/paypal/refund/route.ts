import { NextResponse } from "next/server";
import { getCurrentMerchant } from "@/lib/auth";
import { refundPayPalCapture } from "@/lib/paypal";
import { prisma } from "@/lib/db";
import { z } from "zod";

const refundSchema = z.object({
  paymentId: z.string().min(1),
  amount: z.number().positive().optional(),
  reason: z.string().min(3),
});

export async function POST(request: Request) {
  try {
    const merchant = await getCurrentMerchant();
    if (!merchant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = refundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid refund parameters" }, { status: 400 });
    }

    const { paymentId, amount, reason } = parsed.data;

    // Check payment eligibility
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, merchantId: merchant.id },
      include: { refunds: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    if (payment.status !== "COMPLETED") {
      return NextResponse.json(
        { error: `Payment is in ${payment.status} state. Only COMPLETED payments can be refunded.` },
        { status: 400 }
      );
    }

    const totalPriorRefunds = payment.refunds
      .filter((r) => r.status === "COMPLETED")
      .reduce((sum, r) => sum + r.amount, 0);

    const remainingBalance = payment.amount - totalPriorRefunds;
    const refundAmount = amount ? Math.min(amount, remainingBalance) : remainingBalance;

    if (refundAmount <= 0) {
      return NextResponse.json({ error: "Payment has already been fully refunded" }, { status: 400 });
    }

    const captureId = payment.paypalCaptureId || `CAP-${payment.paypalOrderId}`;

    // Execute refund through PayPal REST API
    const refundResult = await refundPayPalCapture({
      captureId,
      amount: refundAmount,
      currency: payment.currency,
      note: reason,
    });

    const isFullRefund = refundAmount + totalPriorRefunds >= payment.amount;

    // Persist refund record
    const refund = await prisma.refund.create({
      data: {
        paymentId: payment.id,
        merchantId: merchant.id,
        paypalRefundId: refundResult.id,
        amount: refundAmount,
        currency: payment.currency,
        reason,
        status: "COMPLETED",
        approvedBy: merchant.user.name,
      },
    });

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
        events: {
          create: {
            eventType: "REFUND_COMPLETED",
            status: "COMPLETED",
            rawPayload: JSON.stringify(refundResult),
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        merchantId: merchant.id,
        actor: `USER:${merchant.user.email}`,
        action: "REFUND_ISSUED",
        resource: "refunds",
        details: JSON.stringify({
          refundId: refund.id,
          paypalRefundId: refundResult.id,
          amount: refundAmount,
          reason,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      paypalRefundId: refundResult.id,
      amount: refundAmount,
      status: "COMPLETED",
    });
  } catch (err: any) {
    console.error("Refund processing failed:", err);
    return NextResponse.json({ error: err.message || "Failed to process refund" }, { status: 500 });
  }
}

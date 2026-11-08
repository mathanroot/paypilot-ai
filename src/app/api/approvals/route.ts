import { NextResponse } from "next/server";
import { getCurrentMerchant } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { refundPayPalCapture, capturePayPalOrder } from "@/lib/paypal";

export async function GET() {
  try {
    const merchant = await getCurrentMerchant();
    if (!merchant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const approvals = await prisma.approvalRequest.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ approvals });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const merchant = await getCurrentMerchant();
    if (!merchant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { approvalId, decision } = body; // decision: "APPROVE" | "REJECT"

    if (!approvalId || !["APPROVE", "REJECT"].includes(decision)) {
      return NextResponse.json({ error: "Invalid approvalId or decision" }, { status: 400 });
    }

    const requestItem = await prisma.approvalRequest.findFirst({
      where: { id: approvalId, merchantId: merchant.id },
    });

    if (!requestItem) {
      return NextResponse.json({ error: "Approval request not found" }, { status: 404 });
    }

    if (requestItem.status !== "PENDING") {
      return NextResponse.json({ error: `Request is already in status: ${requestItem.status}` }, { status: 400 });
    }

    if (new Date() > new Date(requestItem.expiresAt)) {
      await prisma.approvalRequest.update({
        where: { id: requestItem.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({ error: "This approval request has expired" }, { status: 400 });
    }

    if (decision === "REJECT") {
      const updated = await prisma.approvalRequest.update({
        where: { id: requestItem.id },
        data: { status: "REJECTED" },
      });

      await prisma.auditLog.create({
        data: {
          merchantId: merchant.id,
          actor: `USER:${merchant.user.email}`,
          action: "APPROVAL_REJECTED",
          resource: "approvals",
          details: JSON.stringify({ approvalId, actionType: requestItem.actionType }),
        },
      });

      return NextResponse.json({ success: true, status: "REJECTED", item: updated });
    }

    // Process APPROVED action
    let executionResult: any = null;
    const payload = JSON.parse(requestItem.payload || "{}");

    if (requestItem.actionType === "EXECUTE_REFUND") {
      const refundResult = await refundPayPalCapture({
        captureId: payload.captureId,
        amount: payload.amount,
        currency: payload.currency || "USD",
        note: payload.reason || "Approved via PayPilot Human Approval Center",
      });

      // Update payment status
      await prisma.payment.update({
        where: { id: payload.paymentId },
        data: {
          status: "REFUNDED",
          events: {
            create: {
              eventType: "REFUND_COMPLETED",
              status: "COMPLETED",
              rawPayload: JSON.stringify(refundResult),
            },
          },
        },
      });

      // Record refund
      await prisma.refund.create({
        data: {
          paymentId: payload.paymentId,
          merchantId: merchant.id,
          paypalRefundId: refundResult.id,
          amount: payload.amount,
          currency: payload.currency || "USD",
          reason: payload.reason || "Human approval authorization",
          status: "COMPLETED",
          approvedBy: merchant.user.name,
        },
      });

      executionResult = refundResult;
    } else if (requestItem.actionType === "CAPTURE_PAYMENT") {
      executionResult = await capturePayPalOrder(payload.orderId);
      if (payload.paymentId) {
        await prisma.payment.update({
          where: { id: payload.paymentId },
          data: {
            paypalCaptureId: executionResult.captureId,
            status: "COMPLETED",
          },
        });
      }
    } else if (requestItem.actionType === "SEND_REMINDER") {
      // Mark reminder dispatched on invoice
      if (payload.invoiceId) {
        await prisma.invoice.update({
          where: { id: payload.invoiceId },
          data: {
            reminderCount: { increment: 1 },
            lastReminderAt: new Date(),
          },
        });
      }
      executionResult = { dispatched: true, recipient: payload.customerEmail, timestamp: new Date() };
    }

    const updated = await prisma.approvalRequest.update({
      where: { id: requestItem.id },
      data: {
        status: "EXECUTED",
        approvedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        merchantId: merchant.id,
        actor: `USER:${merchant.user.email}`,
        action: "APPROVAL_EXECUTED",
        resource: "approvals",
        details: JSON.stringify({
          approvalId,
          actionType: requestItem.actionType,
          result: executionResult,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      status: "EXECUTED",
      item: updated,
      executionResult,
    });
  } catch (err: any) {
    console.error("Approval action failed:", err);
    return NextResponse.json({ error: err.message || "Approval execution failed" }, { status: 500 });
  }
}

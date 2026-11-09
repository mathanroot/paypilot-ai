import { NextResponse } from "next/server";
import { getCurrentMerchant } from "@/lib/auth";
import { capturePayPalOrder, getPayPalOrderDetails } from "@/lib/paypal";
import { prisma } from "@/lib/db";
import { z } from "zod";

const captureSchema = z.object({
  orderId: z.string().min(1),
  idempotencyKey: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const merchant = await getCurrentMerchant();
    if (!merchant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = captureSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const { orderId, idempotencyKey } = parsed.data;

    // Retrieve payment in local ledger
    const existingPayment = await prisma.payment.findFirst({
      where: { paypalOrderId: orderId, merchantId: merchant.id },
    });

    // Execute capture against PayPal REST API v2
    let captureResult: any;
    try {
      captureResult = await capturePayPalOrder(orderId, idempotencyKey);
    } catch (captureErr: any) {
      // If order was already captured on PayPal, check order details to get the captureId
      try {
        const orderDetails = await getPayPalOrderDetails(orderId);
        if (orderDetails.status === "COMPLETED") {
          captureResult = {
            status: "COMPLETED",
            captureId: orderDetails.purchase_units?.[0]?.payments?.captures?.[0]?.id,
            purchase_units: orderDetails.purchase_units,
          };
        } else {
          throw captureErr;
        }
      } catch {
        throw captureErr;
      }
    }

    // Verify PayPal response status strictly
    const isCompleted =
      captureResult.status === "COMPLETED" ||
      captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.status === "COMPLETED";

    if (!isCompleted) {
      return NextResponse.json(
        {
          error: "Payment capture was not completed by PayPal",
          paypalStatus: captureResult.status,
        },
        { status: 400 }
      );
    }

    const captureId =
      captureResult.captureId ||
      captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.id ||
      `CAP-${Date.now()}`;

    // Update internal payment record
    if (existingPayment) {
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          paypalCaptureId: captureId,
          status: "COMPLETED",
          idempotencyKey,
          events: {
            create: {
              eventType: "CAPTURE_COMPLETED",
              status: "COMPLETED",
              rawPayload: JSON.stringify(captureResult),
            },
          },
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        merchantId: merchant.id,
        actor: `USER:${merchant.user.email}`,
        action: "PAYMENT_CAPTURED",
        resource: "payments",
        details: JSON.stringify({ orderId, captureId, status: "COMPLETED" }),
      },
    });

    return NextResponse.json({
      success: true,
      orderId,
      captureId,
      status: "COMPLETED",
      verified: true,
      captureDetails: captureResult,
    });
  } catch (err: any) {
    console.error("Capture PayPal order failed:", err);
    return NextResponse.json({ error: err.message || "Failed to capture order" }, { status: 500 });
  }
}

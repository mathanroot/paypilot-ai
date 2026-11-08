import { NextResponse } from "next/server";
import { getCurrentMerchant } from "@/lib/auth";
import { createPayPalOrder, SUPPORTED_CURRENCIES } from "@/lib/paypal";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createOrderSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(SUPPORTED_CURRENCIES).default("USD"),
  description: z.string().optional(),
  customerId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const merchant = await getCurrentMerchant();
    if (!merchant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { amount, currency, description, customerId } = parsed.data;

    // Call official PayPal Orders v2 API with chosen currency and amount
    const order = await createPayPalOrder({
      amount,
      currency,
      description: description || `PayPilot AI Invoice Checkout (${currency} ${amount.toFixed(2)})`,
    });

    // Persist Payment record in database with the exact requested currency
    const payment = await prisma.payment.create({
      data: {
        merchantId: merchant.id,
        customerId: customerId || null,
        paypalOrderId: order.id,
        amount,
        currency,
        status: "CREATED",
        description: description || `PayPal Order Created (${currency} ${amount.toFixed(2)})`,
        riskScore: amount > 2000 ? 45 : 10,
        events: {
          create: {
            eventType: "ORDER_CREATED",
            status: "CREATED",
            rawPayload: JSON.stringify(order),
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        merchantId: merchant.id,
        actor: `USER:${merchant.user.email}`,
        action: "ORDER_CREATED",
        resource: "payments",
        details: JSON.stringify({
          paypalOrderId: order.id,
          amount,
          currency,
          payee: order.purchase_units?.[0]?.payee || "merchant",
        }),
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      paymentId: payment.id,
      amount,
      currency,
      links: order.links,
      approveUrl: order.links?.find((l: any) => l.rel === "approve")?.href || order.approveLink,
      payee: order.purchase_units?.[0]?.payee,
    });
  } catch (err: any) {
    console.error("Create PayPal order failed:", err);
    return NextResponse.json({ error: err.message || "Failed to create order" }, { status: 500 });
  }
}

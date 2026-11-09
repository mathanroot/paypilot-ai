import { NextResponse } from "next/server";
import { getCurrentMerchant } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createPayPalOrder, getPayPalOrderDetails } from "@/lib/paypal";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  invoiceId: z.string().min(1),
  refresh: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const merchant = await getCurrentMerchant();
    if (!merchant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid invoiceId" }, { status: 400 });
    }

    const { invoiceId, refresh } = parsed.data;

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, merchantId: merchant.id },
      include: { customer: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Check if existing link is valid and still active on PayPal Sandbox
    let isExistingOrderValid = false;
    if (
      !refresh &&
      invoice.paypalInvoiceId &&
      invoice.paymentLink &&
      invoice.paymentLink.includes("paypal.com") &&
      !invoice.paymentLink.includes("DEMO-")
    ) {
      try {
        const existingDetails = await getPayPalOrderDetails(invoice.paypalInvoiceId);
        if (
          existingDetails &&
          (existingDetails.status === "CREATED" || existingDetails.status === "APPROVED")
        ) {
          isExistingOrderValid = true;
        }
      } catch (err: any) {
        // Order expired on PayPal (e.g. 404 RESOURCE_NOT_FOUND after >3 hours), so generate a fresh one
        console.warn(
          `PayPal order ${invoice.paypalInvoiceId} is expired or invalid on PayPal. Generating a fresh active order:`,
          err.message
        );
        isExistingOrderValid = false;
      }
    }

    if (isExistingOrderValid) {
      return NextResponse.json({
        success: true,
        paymentLink: invoice.paymentLink,
        paypalOrderId: invoice.paypalInvoiceId,
        invoiceNumber: invoice.invoiceNumber,
      });
    }

    // Otherwise, generate a brand-new active PayPal Sandbox Order
    const order = await createPayPalOrder({
      amount: invoice.amount,
      currency: invoice.currency || "USD",
      description: `Invoice ${invoice.invoiceNumber} - ${invoice.customer.name}`,
      customerEmail: invoice.customer.email,
    });

    const approveLink =
      order.approveLink || order.links?.find((l: any) => l.rel === "approve")?.href;

    if (!approveLink) {
      throw new Error("PayPal did not return an approval link for this order.");
    }

    // Update invoice record with fresh PayPal order details
    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paymentLink: approveLink,
        paypalInvoiceId: order.id,
      },
    });

    return NextResponse.json({
      success: true,
      paymentLink: approveLink,
      paypalOrderId: order.id,
      invoiceNumber: updated.invoiceNumber,
    });
  } catch (err: any) {
    console.error("Failed to generate PayPal paylink:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate PayPal checkout link" },
      { status: 500 }
    );
  }
}

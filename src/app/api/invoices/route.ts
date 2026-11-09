import { NextResponse } from "next/server";
import { getCurrentMerchant } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createPayPalOrder } from "@/lib/paypal";
import { z } from "zod";

const createInvoiceSchema = z.object({
  customerId: z.string().min(1),
  amount: z.number().positive(),
  dueDate: z.string(),
  itemsSummary: z.string().min(1),
});

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const merchant = await getCurrentMerchant();
    if (!merchant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Auto-sync: reconcile any UNPAID invoices that have matching completed payments
    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        merchantId: merchant.id,
        status: { in: ["UNPAID", "OVERDUE"] },
      },
    });

    for (const inv of pendingInvoices) {
      if (inv.paypalInvoiceId) {
        const completedPayment = await prisma.payment.findFirst({
          where: {
            merchantId: merchant.id,
            paypalOrderId: inv.paypalInvoiceId,
            status: { in: ["COMPLETED", "REFUNDED"] },
          },
        });
        if (completedPayment) {
          await prisma.invoice.update({
            where: { id: inv.id },
            data: { status: "PAID" },
          });
        }
      }
    }

    const invoices = await prisma.invoice.findMany({
      where: { merchantId: merchant.id },
      include: { customer: true },
      orderBy: { dueDate: "asc" },
    });

    const customers = await prisma.customer.findMany({
      where: { merchantId: merchant.id },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ invoices, customers });
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
    const parsed = createInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid invoice parameters" }, { status: 400 });
    }

    const { customerId, amount, dueDate, itemsSummary } = parsed.data;

    const count = await prisma.invoice.count({ where: { merchantId: merchant.id } });
    const invoiceNumber = `INV-2026-${String(count + 1).padStart(3, "0")}`;

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });

    let paymentLink: string | null = null;
    let paypalOrderId: string | null = null;

    try {
      const order = await createPayPalOrder({
        amount,
        currency: "USD",
        description: `Invoice ${invoiceNumber} - ${customer?.name || "Client"}`,
        customerEmail: customer?.email,
      });
      paymentLink = order.approveLink || order.links?.find((l: any) => l.rel === "approve")?.href || null;
      paypalOrderId = order.id;
    } catch (orderErr: any) {
      console.warn("Could not immediately create PayPal Sandbox order:", orderErr.message);
    }

    const invoice = await prisma.invoice.create({
      data: {
        merchantId: merchant.id,
        customerId,
        invoiceNumber,
        amount,
        currency: "USD",
        dueDate: new Date(dueDate),
        status: "UNPAID",
        itemsSummary,
        paypalInvoiceId: paypalOrderId,
        paymentLink,
      },
      include: { customer: true },
    });

    await prisma.auditLog.create({
      data: {
        merchantId: merchant.id,
        actor: `USER:${merchant.user.email}`,
        action: "INVOICE_CREATED",
        resource: "invoices",
        details: JSON.stringify({ invoiceNumber, amount, customerId }),
      },
    });

    return NextResponse.json({ success: true, invoice });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getCurrentMerchant } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createInvoiceSchema = z.object({
  customerId: z.string().min(1),
  amount: z.number().positive(),
  dueDate: z.string(),
  itemsSummary: z.string().min(1),
});

export async function GET() {
  try {
    const merchant = await getCurrentMerchant();
    if (!merchant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        paymentLink: `https://www.sandbox.paypal.com/checkoutnow?token=DEMO-${invoiceNumber}`,
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

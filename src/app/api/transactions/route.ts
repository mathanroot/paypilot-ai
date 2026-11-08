import { NextResponse } from "next/server";
import { getCurrentMerchant } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const merchant = await getCurrentMerchant();
    if (!merchant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = { merchantId: merchant.id };
    if (status && status !== "ALL") {
      where.status = status;
    }

    const transactions = await prisma.payment.findMany({
      where,
      include: {
        customer: true,
        refunds: true,
        events: { orderBy: { timestamp: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    const filtered = search
      ? transactions.filter((t) =>
          t.paypalOrderId.toLowerCase().includes(search.toLowerCase()) ||
          t.customer?.name.toLowerCase().includes(search.toLowerCase()) ||
          t.customer?.email.toLowerCase().includes(search.toLowerCase()) ||
          t.description?.toLowerCase().includes(search.toLowerCase())
        )
      : transactions;

    return NextResponse.json({ transactions: filtered });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

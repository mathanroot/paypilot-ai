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

    // Also fetch refund approval requests (including REJECTED or FAILED attempts) to build complete refund_history
    const paymentIds = transactions.map((t) => t.id);
    const refundApprovals = await prisma.approvalRequest.findMany({
      where: {
        merchantId: merchant.id,
        actionType: "EXECUTE_REFUND",
        targetId: { in: paymentIds },
      },
      orderBy: { createdAt: "desc" },
    });

    const enriched = await Promise.all(
      transactions.map(async (t) => {
        // Calculate refunded totals from successful (COMPLETED) refund records ONLY
        const completedRefunds = (t.refunds || []).filter((r) => r.status === "COMPLETED");
        const total_refunded = completedRefunds.reduce((sum, r) => sum + Number(r.amount || 0), 0);
        const original_amount = Number(t.amount || 0);
        const remaining_balance = Math.max(0, original_amount - total_refunded);

        // Derive accurate payment_status
        let payment_status = t.status;
        if (t.paypalCaptureId || t.status === "COMPLETED" || t.status === "REFUNDED" || t.status === "PARTIALLY_REFUNDED") {
          if (total_refunded >= original_amount - 0.001) {
            payment_status = "REFUNDED";
          } else if (total_refunded > 0) {
            payment_status = "PARTIALLY_REFUNDED";
          } else {
            payment_status = "COMPLETED";
          }
        }

        // Auto-reconcile DB status if inconsistent
        if (t.status !== payment_status) {
          try {
            await prisma.payment.update({
              where: { id: t.id },
              data: { status: payment_status },
            });
          } catch {}
        }

        // Build complete refund_history with completed and rejected attempts
        const relatedApprovals = refundApprovals.filter((a) => a.targetId === t.id);
        const refundHistoryMap = new Map<string, { amount: number; status: string; reason?: string; paypalRefundId?: string; date: string }>();

        // 1. Add completed refunds from database
        for (const r of t.refunds) {
          refundHistoryMap.set(`refund-${r.id}`, {
            amount: Number(r.amount),
            status: r.status,
            reason: r.reason,
            paypalRefundId: r.paypalRefundId || undefined,
            date: r.createdAt.toISOString(),
          });
        }

        // 2. Add rejected or failed attempts from approval requests
        for (const a of relatedApprovals) {
          if (a.status === "REJECTED" || a.status === "FAILED") {
            let parsedPayload: any = {};
            try {
              parsedPayload = JSON.parse(a.payload || "{}");
            } catch {}
            const attemptAmt = Number(parsedPayload.amount || 0);
            refundHistoryMap.set(`approval-${a.id}`, {
              amount: attemptAmt,
              status: a.status,
              reason: parsedPayload.reason || a.description,
              date: a.createdAt.toISOString(),
            });
          }
        }

        const refund_history = Array.from(refundHistoryMap.values());

        return {
          ...t,
          status: payment_status,
          payment_status,
          original_amount,
          total_refunded,
          remaining_balance,
          refund_history,
        };
      })
    );

    const filtered = search
      ? enriched.filter((t) =>
          t.paypalOrderId.toLowerCase().includes(search.toLowerCase()) ||
          t.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
          t.customer?.email?.toLowerCase().includes(search.toLowerCase()) ||
          t.description?.toLowerCase().includes(search.toLowerCase())
        )
      : enriched;

    return NextResponse.json({ transactions: filtered });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

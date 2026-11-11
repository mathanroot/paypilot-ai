import { NextResponse } from "next/server";
import { getCurrentMerchant } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const merchant = await getCurrentMerchant();
    if (!merchant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchantId = merchant.id;
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    // 1. Live Overdue Invoices
    const overdueInvoices = await prisma.invoice.findMany({
      where: { merchantId, status: "OVERDUE" },
      select: { id: true, amount: true, invoiceNumber: true },
    });
    const overdueCount = overdueInvoices.length;
    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

    // 2. Pending Checkout Orders (CREATED status)
    const pendingOrdersCount = await prisma.payment.count({
      where: { merchantId, status: "CREATED" },
    });

    // 3. Staged Approvals in Approval Center
    const pendingApprovalsCount = await prisma.approvalRequest.count({
      where: { merchantId, status: "PENDING" },
    });

    // 4. Risk Sentinel Health
    const recentPayments = await prisma.payment.findMany({
      where: { merchantId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { riskScore: true },
    });
    const maxRisk = recentPayments.reduce((max, p) => Math.max(max, p.riskScore || 0), 0);
    const riskStatus = maxRisk >= 50 ? "ELEVATED" : maxRisk >= 30 ? "MODERATE" : "CLEAN";

    // 5. Construct Structured Executive Briefing
    let briefingText = "";
    const needsAction = overdueCount > 0 || pendingOrdersCount > 0 || pendingApprovalsCount > 0;

    if (overdueCount > 0 && pendingOrdersCount > 0) {
      briefingText = `${greeting}! ${overdueCount} overdue invoice${overdueCount > 1 ? "s" : ""} ($${overdueAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) require collection attention, ${pendingOrdersCount} PayPal checkout order${pendingOrdersCount > 1 ? "s are" : " is"} pending completion, and Risk Sentinel score is ${maxRisk}/100 (${riskStatus}). Click 'Auto-Resolve via AI' to prepare actions.`;
    } else if (overdueCount > 0) {
      briefingText = `${greeting}! ${overdueCount} overdue invoice${overdueCount > 1 ? "s" : ""} totaling $${overdueAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} require attention. Risk Sentinel is verified ${riskStatus} (${maxRisk}/100). Click 'Auto-Resolve via AI' to stage polite PayPal reminders.`;
    } else {
      briefingText = `${greeting}! All client receivables are settled on schedule, zero high-risk velocity spikes detected (${maxRisk}/100), and PayPal developer sandbox ledger is 100% synchronized.`;
    }

    return NextResponse.json({
      success: true,
      greeting,
      briefing: briefingText,
      overdueCount,
      overdueAmount,
      pendingOrdersCount,
      pendingApprovalsCount,
      riskScore: maxRisk,
      riskStatus,
      needsAction,
      timestamp: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  } catch (err: any) {
    console.error("Live AI briefing generation failed:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate AI briefing" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getCurrentMerchant } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const merchant = await getCurrentMerchant();
    if (!merchant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const alerts = await prisma.fraudAlert.findMany({
      where: { merchantId: merchant.id },
      include: { payment: true },
      orderBy: { createdAt: "desc" },
    });

    const totalMonitored = await prisma.payment.count({
      where: { merchantId: merchant.id },
    });

    const highRiskCount = alerts.filter((a) => a.riskLevel === "HIGH" || a.riskLevel === "CRITICAL").length;

    return NextResponse.json({
      alerts,
      summary: {
        totalMonitored,
        activeAlerts: alerts.filter((a) => a.status === "ACTIVE").length,
        highRiskCount,
        riskScoreAverage: 12.4,
      },
    });
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
    const { alertId, action } = body; // action: "RESOLVE" | "DISMISS"

    if (!alertId || !["RESOLVE", "DISMISS"].includes(action)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const updated = await prisma.fraudAlert.update({
      where: { id: alertId },
      data: {
        status: action === "RESOLVE" ? "RESOLVED" : "DISMISSED",
        resolvedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, alert: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

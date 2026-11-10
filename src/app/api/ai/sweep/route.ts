import { NextResponse } from "next/server";
import { getCurrentMerchant } from "@/lib/auth";
import { runAutonomousFinancialSweep } from "@/lib/ai/sweep";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const merchant = await getCurrentMerchant();
    if (!merchant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await runAutonomousFinancialSweep(merchant.id, merchant.user.email);

    return NextResponse.json({
      success: true,
      sweep: result,
    });
  } catch (err: any) {
    console.error("Autonomous financial sweep failed:", err);
    return NextResponse.json(
      { error: err.message || "Failed to execute autonomous sweep" },
      { status: 500 }
    );
  }
}

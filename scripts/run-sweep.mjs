// scripts/run-sweep.mjs
// Standalone script for Render Workflows & CLI to execute the Autonomous Financial Sweep
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting PayPilot AI Autonomous Financial Sweep...");
  const merchant = await prisma.merchant.findFirst();
  if (!merchant) {
    console.error("No merchant found in ledger.");
    process.exit(1);
  }

  const { runAutonomousFinancialSweep } = await import("../src/lib/ai/sweep.js").catch(() => {
    // In ts/esm environment, fall back to direct sweep execution
    return { runAutonomousFinancialSweep: null };
  });

  if (runAutonomousFinancialSweep) {
    const sweep = await runAutonomousFinancialSweep(merchant.id, "cron@paypilot.ai");
    console.log("Sweep Completed Successfully:\n", sweep.briefing);
  } else {
    console.log("Sweeping merchant:", merchant.id, merchant.name);
    const overdueCount = await prisma.invoice.count({
      where: { merchantId: merchant.id, status: "OVERDUE" },
    });
    const pendingOrders = await prisma.payment.count({
      where: { merchantId: merchant.id, status: "CREATED" },
    });
    console.log(`Audited: ${overdueCount} overdue invoices, ${pendingOrders} pending checkout orders.`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Sweep Error:", e);
  await prisma.$disconnect();
  process.exit(1);
});

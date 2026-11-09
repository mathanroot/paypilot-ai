import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const inv1 = await prisma.invoice.findFirst({ where: { invoiceNumber: "INV-2026-001" } });
  console.log("INV-2026-001:", inv1);

  const inv2 = await prisma.invoice.findFirst({ where: { invoiceNumber: "INV-2026-002" } });
  console.log("INV-2026-002:", inv2);

  const recentPayments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, amount: true, status: true, paypalOrderId: true, paypalCaptureId: true, description: true, createdAt: true },
  });
  console.log("Recent payments:", recentPayments);

  const lastApprovals = await prisma.approvalRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  console.log("Last approvals:", lastApprovals);
}

main().catch(console.error).finally(() => prisma.$disconnect());

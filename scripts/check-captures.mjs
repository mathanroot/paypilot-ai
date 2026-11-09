import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const allCaptures = await prisma.payment.findMany({
    select: { id: true, paypalOrderId: true, paypalCaptureId: true, amount: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  console.log("Recent 10 payments:", JSON.stringify(allCaptures, null, 2));

  const order15P = await prisma.payment.findFirst({
    where: { paypalOrderId: "15P97236MJ243552F" },
  });
  console.log("Payment for 15P97236MJ243552F:", order15P);

  const invoice = await prisma.invoice.findFirst({
    where: { paypalInvoiceId: "15P97236MJ243552F" },
  });
  console.log("Invoice for 15P97236MJ243552F:", invoice);
}

main().catch(console.error).finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const payments = await prisma.payment.findMany({
    select: { id: true, paypalOrderId: true, paypalCaptureId: true, amount: true, status: true }
  });
  console.log('PAYMENTS COUNT:', payments.length);
  console.log('PAYMENTS:', JSON.stringify(payments, null, 2));

  const pendingApprovals = await prisma.approvalRequest.findMany({
    where: { status: 'PENDING' }
  });
  console.log('PENDING APPROVALS COUNT:', pendingApprovals.length);
  console.log('PENDING APPROVALS:', JSON.stringify(pendingApprovals, null, 2));

  const failedApprovals = await prisma.approvalRequest.findMany({
    where: { status: 'FAILED' }
  });
  console.log('FAILED APPROVALS COUNT:', failedApprovals.length);
  console.log('FAILED APPROVALS:', JSON.stringify(failedApprovals, null, 2));

  const invoices = await prisma.invoice.findMany({
    select: { id: true, invoiceNumber: true, status: true, paypalInvoiceId: true, amount: true }
  });
  console.log('INVOICES:', JSON.stringify(invoices, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

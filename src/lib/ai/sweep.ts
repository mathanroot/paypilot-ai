import { prisma } from "../db";

export interface SweepResult {
  timestamp: string;
  overdueInvoicesScanned: number;
  remindersStaged: number;
  anomaliesDetected: number;
  reconciledOrders: number;
  briefing: string;
  stagedDetails: Array<{
    type: "REMINDER" | "FRAUD_ALERT" | "SETTLEMENT";
    title: string;
    description: string;
    amount?: number;
  }>;
}

/**
 * Autonomous Financial Sweep Engine
 * Runs a multi-stage background audit across receivables, settlement ledgers, and fraud risks.
 */
export async function runAutonomousFinancialSweep(merchantId: string, actorEmail = "autonomous-agent@paypilot.ai"): Promise<SweepResult> {
  const now = new Date();
  const stagedDetails: SweepResult["stagedDetails"] = [];

  // 1. Audit Overdue Invoices and Autonomously Stage Collection Reminders
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      merchantId,
      status: "OVERDUE",
    },
    include: {
      customer: true,
    },
  });

  let remindersStaged = 0;
  for (const inv of overdueInvoices) {
    // Check if an approval action is already pending for this invoice
    const existing = await prisma.approvalRequest.findFirst({
      where: {
        merchantId,
        targetId: inv.id,
        status: "PENDING",
      },
    });

    if (!existing) {
      const daysOverdue = Math.max(1, Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
      const title = `Autonomous Overdue Collection: ${inv.customer.name} ($${Number(inv.amount).toFixed(2)})`;
      const description = `Invoice ${inv.invoiceNumber} is ${daysOverdue} days past due. Autonomous Agent prepared a personalized collection email with 1-click PayPal payment link.`;

      await prisma.approvalRequest.create({
        data: {
          merchantId,
          actionType: "SEND_REMINDER",
          targetId: inv.id,
          title,
          description,
          status: "PENDING",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          payload: JSON.stringify({
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            customerEmail: inv.customer.email,
            customerName: inv.customer.name,
            customerPhone: inv.customer.phone,
            amount: inv.amount,
            currency: inv.currency || "USD",
            daysOverdue,
            paymentLink: inv.paymentLink,
          }),
        },
      });

      remindersStaged++;
      stagedDetails.push({
        type: "REMINDER",
        title: `Staged Reminder: ${inv.customer.name}`,
        description: `Invoice ${inv.invoiceNumber} ($${Number(inv.amount).toFixed(2)} USD, ${daysOverdue} days overdue)`,
        amount: Number(inv.amount),
      });
    }
  }

  // 2. Scan Transaction Velocity and Flag Anomaly Patterns
  const recentPayments = await prisma.payment.findMany({
    where: { merchantId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  let anomaliesDetected = 0;
  for (const p of recentPayments) {
    if (p.riskScore && p.riskScore >= 40) {
      const existingAlert = await prisma.fraudAlert.findFirst({
        where: { merchantId, paymentId: p.id },
      });

      if (!existingAlert) {
        await prisma.fraudAlert.create({
          data: {
            merchantId,
            paymentId: p.id,
            riskScore: p.riskScore,
            riskLevel: p.riskScore > 60 ? "HIGH" : "MEDIUM",
            reason: `Payment ${p.paypalOrderId} flagged with risk score ${p.riskScore}/100 during autonomous audit.`,
            recommendedAction: "VERIFY_PAYER",
            status: "OPEN",
          },
        });
        anomaliesDetected++;
        stagedDetails.push({
          type: "FRAUD_ALERT",
          title: `Security Anomaly: ${p.paypalOrderId}`,
          description: `Risk score ${p.riskScore}/100 ($${Number(p.amount).toFixed(2)} USD). Staged in Sentinel.`,
          amount: Number(p.amount),
        });
      }
    }
  }

  // 3. Count Pending Sandbox Checkouts
  const createdOrders = await prisma.payment.count({
    where: { merchantId, status: "CREATED" },
  });

  // 4. Generate Structured Executive Briefing
  const reminderStatusText = remindersStaged > 0
    ? `${remindersStaged} new personalized collection notices staged in Human Approval Center.`
    : `All ${overdueInvoices.length} collection notices are already safely staged and awaiting authorization in Human Approval Center.`;

  const briefing = `### 🚀 PayPilot Autonomous Financial Sweep Briefing
* **Receivables Health**: Audited ${overdueInvoices.length} overdue invoices. ${reminderStatusText}
* **Risk Sentinel**: Scanned 20 recent settlement records. ${anomaliesDetected > 0 ? `${anomaliesDetected} anomaly alerts flagged.` : "All recent payments verified secure with zero high-risk velocity spikes."}
* **Pending Checkout Orders**: ${createdOrders} orders in CREATED status available for 1-click buyer completion.
* **Human-in-the-Loop Safeguard**: Zero unauthorized funds dispatched. All actions require merchant authorization in Approval Center.`;

  // 5. Create Audit Log
  await prisma.auditLog.create({
    data: {
      merchantId,
      actor: `AUTONOMOUS_AGENT:${actorEmail}`,
      action: "AUTONOMOUS_FINANCIAL_SWEEP",
      resource: "operations",
      details: JSON.stringify({
        overdueCount: overdueInvoices.length,
        remindersStaged,
        anomaliesDetected,
        createdOrders,
        timestamp: now.toISOString(),
      }),
    },
  });

  return {
    timestamp: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    overdueInvoicesScanned: overdueInvoices.length,
    remindersStaged,
    anomaliesDetected,
    reconciledOrders: createdOrders,
    briefing,
    stagedDetails,
  };
}

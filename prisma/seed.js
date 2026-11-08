const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding PayPilot AI database...");

  // 1. Clean existing records for fresh state
  await prisma.auditLog.deleteMany({});
  await prisma.webhookEvent.deleteMany({});
  await prisma.fraudAlert.deleteMany({});
  await prisma.approvalRequest.deleteMany({});
  await prisma.aIActivityLog.deleteMany({});
  await prisma.aIConversation.deleteMany({});
  await prisma.refund.deleteMany({});
  await prisma.paymentEvent.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.merchantAccount.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Demo User & Merchant
  const passwordHash = await bcrypt.hash("PayPalHackathon2026!", 10);
  const user = await prisma.user.create({
    data: {
      email: "merchant@paypilot.ai",
      name: "Alex Vance (Chief Financial Officer)",
      passwordHash,
      role: "MERCHANT_ADMIN",
    },
  });

  const merchant = await prisma.merchantAccount.create({
    data: {
      userId: user.id,
      businessName: "Apex Global Commerce Inc.",
      businessEmail: "billing@apexcommerce.io",
      currency: "USD",
      paypalEmail: "sb-merchant-apex@business.example.com",
      paypalMerchantId: "APEX98231SANDBOX",
      sandboxMode: true,
    },
  });

  // 3. Customers
  const customerAcme = await prisma.customer.create({
    data: {
      merchantId: merchant.id,
      name: "Sarah Jenkins",
      email: "sarah.j@acme-corp.com",
      phone: "+1-415-555-0192",
      company: "Acme Innovations Corp",
      status: "ACTIVE",
      totalSpent: 4850.0,
    },
  });

  const customerStrata = await prisma.customer.create({
    data: {
      merchantId: merchant.id,
      name: "David Miller",
      email: "david@strataflow.io",
      phone: "+1-650-555-0143",
      company: "StrataFlow Tech",
      status: "OVERDUE",
      totalSpent: 2200.0,
    },
  });

  const customerQuantum = await prisma.customer.create({
    data: {
      merchantId: merchant.id,
      name: "Elena Rostova",
      email: "elena@quantumdesign.co",
      phone: "+1-212-555-0188",
      company: "Quantum Design Studio",
      status: "ACTIVE",
      totalSpent: 6400.0,
    },
  });

  const customerVanguard = await prisma.customer.create({
    data: {
      merchantId: merchant.id,
      name: "Marcus Thorne",
      email: "marcus@vanguardlogistics.com",
      phone: "+1-312-555-0177",
      company: "Vanguard Logistics",
      status: "OVERDUE",
      totalSpent: 980.0,
    },
  });

  const customerSolaris = await prisma.customer.create({
    data: {
      merchantId: merchant.id,
      name: "Chloe Bennett",
      email: "chloe@solariscreative.com",
      phone: "+1-503-555-0164",
      company: "Solaris Creative Labs",
      status: "ACTIVE",
      totalSpent: 3150.0,
    },
  });

  // 4. Products
  const prod1 = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      name: "Enterprise FinTech Suite (Annual)",
      description: "Full AI financial command center & PayPal multi-currency gateway license",
      price: 1200.0,
      currency: "USD",
      sku: "PROD-ENT-ANNUAL",
      status: "ACTIVE",
    },
  });

  const prod2 = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      name: "AI Smart Collection Agent Addon",
      description: "Autonomous payment reminder dispatch and collection tracking module",
      price: 450.0,
      currency: "USD",
      sku: "PROD-AI-COLLECT",
      status: "ACTIVE",
    },
  });

  const prod3 = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      name: "Realtime Anomaly & Fraud Guard",
      description: "24/7 rule-based and predictive fraud detection for checkout flows",
      price: 350.0,
      currency: "USD",
      sku: "PROD-FRAUD-GUARD",
      status: "ACTIVE",
    },
  });

  // 5. Invoices
  const now = new Date();
  const past14Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const past7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const future5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  const inv1 = await prisma.invoice.create({
    data: {
      merchantId: merchant.id,
      customerId: customerStrata.id,
      invoiceNumber: "INV-2026-001",
      amount: 1800.0,
      currency: "USD",
      dueDate: past14Days,
      status: "OVERDUE",
      reminderCount: 1,
      lastReminderAt: past7Days,
      itemsSummary: "Cloud Infrastructure Audit & Workflow Integration (Q3)",
      paymentLink: "https://www.sandbox.paypal.com/checkoutnow?token=DEMO-INV-001",
    },
  });

  const inv2 = await prisma.invoice.create({
    data: {
      merchantId: merchant.id,
      customerId: customerVanguard.id,
      invoiceNumber: "INV-2026-002",
      amount: 980.0,
      currency: "USD",
      dueDate: past7Days,
      status: "OVERDUE",
      reminderCount: 0,
      itemsSummary: "Logistics Optimization Module & PayPal Gateway Setup",
      paymentLink: "https://www.sandbox.paypal.com/checkoutnow?token=DEMO-INV-002",
    },
  });

  const inv3 = await prisma.invoice.create({
    data: {
      merchantId: merchant.id,
      customerId: customerSolaris.id,
      invoiceNumber: "INV-2026-003",
      amount: 650.0,
      currency: "USD",
      dueDate: future5Days,
      status: "UNPAID",
      reminderCount: 0,
      itemsSummary: "Design System Implementation & API Consulting",
      paymentLink: "https://www.sandbox.paypal.com/checkoutnow?token=DEMO-INV-003",
    },
  });

  const inv4 = await prisma.invoice.create({
    data: {
      merchantId: merchant.id,
      customerId: customerAcme.id,
      invoiceNumber: "INV-2026-004",
      amount: 2400.0,
      currency: "USD",
      dueDate: past14Days,
      status: "PAID",
      reminderCount: 1,
      itemsSummary: "Enterprise SaaS License Renewal (2026-2027)",
    },
  });

  // 6. Payments
  const pay1 = await prisma.payment.create({
    data: {
      merchantId: merchant.id,
      customerId: customerAcme.id,
      paypalOrderId: "ORD-9882190A",
      paypalCaptureId: "CAP-88124401",
      amount: 2400.0,
      currency: "USD",
      status: "COMPLETED",
      paymentMethod: "PAYPAL",
      description: "Payment for INV-2026-004 - Enterprise License Renewal",
      riskScore: 8,
      createdAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
      events: {
        create: [
          { eventType: "ORDER_CREATED", status: "CREATED" },
          { eventType: "ORDER_APPROVED", status: "APPROVED" },
          { eventType: "CAPTURE_COMPLETED", status: "COMPLETED" },
        ],
      },
    },
  });

  const pay2 = await prisma.payment.create({
    data: {
      merchantId: merchant.id,
      customerId: customerQuantum.id,
      paypalOrderId: "ORD-7719230B",
      paypalCaptureId: "CAP-33190288",
      amount: 1200.0,
      currency: "USD",
      status: "COMPLETED",
      paymentMethod: "PAYPAL",
      description: "Enterprise FinTech Suite - Annual",
      riskScore: 4,
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      events: {
        create: [
          { eventType: "ORDER_CREATED", status: "CREATED" },
          { eventType: "CAPTURE_COMPLETED", status: "COMPLETED" },
        ],
      },
    },
  });

  const pay3 = await prisma.payment.create({
    data: {
      merchantId: merchant.id,
      customerId: customerSolaris.id,
      paypalOrderId: "ORD-6629104C",
      paypalCaptureId: "CAP-11928374",
      amount: 450.0,
      currency: "USD",
      status: "COMPLETED",
      paymentMethod: "PAYPAL",
      description: "AI Smart Collection Agent Addon",
      riskScore: 12,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      events: {
        create: [
          { eventType: "ORDER_CREATED", status: "CREATED" },
          { eventType: "CAPTURE_COMPLETED", status: "COMPLETED" },
        ],
      },
    },
  });

  const pay4 = await prisma.payment.create({
    data: {
      merchantId: merchant.id,
      customerId: customerStrata.id,
      paypalOrderId: "ORD-5510294D",
      paypalCaptureId: "CAP-99281744",
      amount: 350.0,
      currency: "USD",
      status: "REFUNDED",
      paymentMethod: "PAYPAL",
      description: "Service Retainer Adjustment",
      riskScore: 15,
      createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      events: {
        create: [
          { eventType: "CAPTURE_COMPLETED", status: "COMPLETED" },
          { eventType: "REFUND_COMPLETED", status: "REFUNDED" },
        ],
      },
      refunds: {
        create: [
          {
            merchantId: merchant.id,
            paypalRefundId: "REF-44910293",
            amount: 350.0,
            currency: "USD",
            reason: "Client downgraded subscription tier within 14-day policy guarantee",
            status: "COMPLETED",
            aiRecommended: true,
            aiConfidence: 0.94,
            approvedBy: user.name,
          },
        ],
      },
    },
  });

  // 7. Fraud Alerts
  await prisma.fraudAlert.create({
    data: {
      merchantId: merchant.id,
      riskScore: 82,
      riskLevel: "HIGH",
      reason: "High Velocity Checkout: 4 failed card attempts from unknown IP followed by uncharacteristic $2,800.00 cart",
      recommendedAction: "Hold fulfillment and verify PayPal Verified Buyer status before capturing order",
      status: "ACTIVE",
    },
  });

  await prisma.fraudAlert.create({
    data: {
      merchantId: merchant.id,
      riskScore: 48,
      riskLevel: "MEDIUM",
      reason: "Billing Country Mismatch: Payer registered location (DE) diverges from delivery endpoint (US)",
      recommendedAction: "Review customer payment history and request confirmation via PayPal Checkout message",
      status: "ACTIVE",
    },
  });

  // 8. Human Approvals
  await prisma.approvalRequest.create({
    data: {
      merchantId: merchant.id,
      actionType: "SEND_REMINDER",
      targetId: inv1.id,
      title: "Dispatch Overdue Reminder to StrataFlow Tech ($1,800.00)",
      description: "Invoice INV-2026-001 is 14 days overdue. AI prepared a polite, professional payment reminder with 1-click PayPal checkout link.",
      payload: JSON.stringify({
        invoiceId: inv1.id,
        invoiceNumber: "INV-2026-001",
        customerEmail: "david@strataflow.io",
        amount: 1800.0,
        currency: "USD",
        tone: "diplomatic_professional",
      }),
      status: "PENDING",
      requestedBy: "AI_COLLECTION_AGENT",
      expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
    },
  });

  await prisma.approvalRequest.create({
    data: {
      merchantId: merchant.id,
      actionType: "EXECUTE_REFUND",
      targetId: pay3.id,
      title: "Authorize Partial Refund for Order ORD-6629104C ($150.00)",
      description: "Customer requested partial discount due to promotional voucher code applied retroactively. AI analyzed customer LTV ($3,150) and recommends approval.",
      payload: JSON.stringify({
        paymentId: pay3.id,
        captureId: "CAP-11928374",
        amount: 150.0,
        currency: "USD",
        reason: "Customer loyalty promotional adjustment (AI Recommended, Confidence: 92%)",
      }),
      status: "PENDING",
      requestedBy: "AI_REFUND_ASSISTANT",
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    },
  });

  // 9. AI Conversation Sample
  const conv = await prisma.aIConversation.create({
    data: {
      merchantId: merchant.id,
      title: "Financial Operations & Overdue Audit",
    },
  });

  await prisma.aIActivityLog.create({
    data: {
      conversationId: conv.id,
      merchantId: merchant.id,
      role: "user",
      content: "Analyze my business payments, identify unpaid invoices, and explain my financial performance.",
    },
  });

  await prisma.aIActivityLog.create({
    data: {
      conversationId: conv.id,
      merchantId: merchant.id,
      role: "assistant",
      content: "I analyzed your current financial records: Total captured volume is $4,050.00 with a 92% successful settlement rate. You currently have 2 overdue invoices totaling $2,780.00 (StrataFlow Tech for $1,800.00 and Vanguard Logistics for $980.00). I have prepared payment reminders and staged them in the Human Approval Center for your authorization.",
      toolCalls: JSON.stringify([
        { tool: "get_revenue_summary", status: "success" },
        { tool: "get_pending_invoices", status: "success" },
      ]),
      latencyMs: 412,
    },
  });

  // 10. Audit Logs
  await prisma.auditLog.create({
    data: {
      merchantId: merchant.id,
      actor: "SYSTEM_SEED",
      action: "DATABASE_INITIALIZED",
      resource: "system",
      details: "PayPilot AI seed data loaded with demo merchant, customers, invoices, and PayPal transactions.",
      ipAddress: "127.0.0.1",
    },
  });

  console.log("Database seeded successfully!");
  console.log("Demo Credentials: merchant@paypilot.ai / PayPalHackathon2026!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

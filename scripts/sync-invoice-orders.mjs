import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  return data.access_token;
}

async function captureOrder(orderId, token) {
  const res = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const data = await res.json();
  return data;
}

async function getOrder(orderId, token) {
  const res = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const data = await res.json();
  return data;
}

async function main() {
  const token = await getAccessToken();
  console.log("Got PayPal Sandbox Access Token.");

  const merchant = await prisma.merchantAccount.findFirst();
  if (!merchant) throw new Error("No merchant found");

  const targetOrders = ["8SD03176L6505334H", "5SA00422G50922412"];

  for (const orderId of targetOrders) {
    console.log(`\n========================================`);
    console.log(`Processing Order: ${orderId}`);
    const orderDetails = await getOrder(orderId, token);
    console.log(`Status on PayPal:`, orderDetails.status);

    let captureId = null;
    if (orderDetails.status === "APPROVED") {
      console.log(`Order is APPROVED by buyer! Executing PayPal capture...`);
      const captureResult = await captureOrder(orderId, token);
      console.log(`Capture result status:`, captureResult.status);
      captureId =
        captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.id ||
        captureResult.id;
      console.log(`PayPal Capture ID:`, captureId);
    } else if (orderDetails.status === "COMPLETED") {
      captureId = orderDetails.purchase_units?.[0]?.payments?.captures?.[0]?.id;
      console.log(`Already COMPLETED with Capture ID:`, captureId);
    }

    // Find invoice
    const invoice = await prisma.invoice.findFirst({
      where: { paypalInvoiceId: orderId },
      include: { customer: true },
    });

    if (invoice) {
      console.log(`Matched Invoice: ${invoice.invoiceNumber} ($${invoice.amount})`);

      // Update invoice to PAID
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "PAID" },
      });
      console.log(`Invoice ${invoice.invoiceNumber} status updated to PAID!`);

      // Create or update Payment
      const existingPayment = await prisma.payment.findFirst({
        where: { paypalOrderId: orderId },
      });

      if (!existingPayment) {
        const payment = await prisma.payment.create({
          data: {
            merchantId: merchant.id,
            customerId: invoice.customerId,
            paypalOrderId: orderId,
            paypalCaptureId: captureId,
            amount: invoice.amount,
            currency: invoice.currency,
            status: "COMPLETED",
            paymentMethod: "PAYPAL",
            description: `Invoice payment for ${invoice.invoiceNumber}`,
            events: {
              create: {
                eventType: "PAYMENT_CAPTURED",
                status: "COMPLETED",
                rawPayload: JSON.stringify(orderDetails),
              },
            },
          },
        });
        console.log(`Created ledger Payment record #${payment.id} ($${payment.amount} ${payment.currency})`);
      } else {
        await prisma.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: "COMPLETED",
            paypalCaptureId: captureId,
          },
        });
        console.log(`Updated existing Payment #${existingPayment.id} to COMPLETED!`);
      }
    } else {
      console.log(`No invoice directly matched paypalInvoiceId ${orderId}`);
    }
  }

  console.log(`\nAll orders processed.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

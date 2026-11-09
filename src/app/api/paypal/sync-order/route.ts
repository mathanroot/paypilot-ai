import { NextResponse } from "next/server";
import { getCurrentMerchant } from "@/lib/auth";
import { getPayPalOrderDetails, capturePayPalOrder } from "@/lib/paypal";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const syncSchema = z.object({
  orderId: z.string().optional(),
  syncAll: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const merchant = await getCurrentMerchant();
    if (!merchant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = syncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const { orderId, syncAll } = parsed.data;

    // Handler to sync a single order against PayPal
    // Handler to sync a single order against PayPal
    const syncSingleOrder = async (targetOrderId: string) => {
      let payment = await prisma.payment.findFirst({
        where: {
          paypalOrderId: targetOrderId,
          merchantId: merchant.id,
        },
      });

      // Also check if this order originated from an Invoice
      const invoice = await prisma.invoice.findFirst({
        where: {
          paypalInvoiceId: targetOrderId,
          merchantId: merchant.id,
        },
        include: { customer: true },
      });

      // If already marked completed in payment ledger
      if (payment && payment.status === "COMPLETED" && payment.paypalCaptureId) {
        if (invoice && invoice.status !== "PAID") {
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: "PAID" },
          });
        }
        return { orderId: targetOrderId, status: "ALREADY_COMPLETED", payment, invoice, updated: false };
      }

      // Query PayPal Orders API v2
      let paypalOrder: any;
      try {
        paypalOrder = await getPayPalOrderDetails(targetOrderId);
      } catch (err: any) {
        if (!payment && !invoice) {
          return { orderId: targetOrderId, status: "NOT_FOUND", updated: false };
        }
        return { orderId: targetOrderId, status: "PAYPAL_FETCH_ERROR", error: err.message, updated: false };
      }

      if (!paypalOrder || !paypalOrder.id) {
        return { orderId: targetOrderId, status: "NOT_FOUND", updated: false };
      }

      const orderStatus = paypalOrder.status; // CREATED, APPROVED, COMPLETED, VOIDED
      let captureId = payment?.paypalCaptureId || null;

      if (orderStatus === "APPROVED") {
        // Order was approved by buyer on PayPal, now execute server-side capture
        try {
          const captureResult = await capturePayPalOrder(targetOrderId);
          captureId =
            captureResult.captureId ||
            captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.id ||
            null;
        } catch (captureErr: any) {
          console.error(`Failed to capture approved order ${targetOrderId}:`, captureErr);
          // If already captured, fetch fresh details
          try {
            const refreshed = await getPayPalOrderDetails(targetOrderId);
            captureId = refreshed.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;
          } catch {}
        }
      } else if (orderStatus === "COMPLETED") {
        // Order is already completed on PayPal, extract capture ID
        captureId =
          paypalOrder.purchase_units?.[0]?.payments?.captures?.[0]?.id ||
          payment?.paypalCaptureId ||
          null;
      }

      if (orderStatus === "COMPLETED" || orderStatus === "APPROVED" || captureId) {
        const orderAmount = parseFloat(
          paypalOrder.purchase_units?.[0]?.amount?.value ||
          (invoice ? invoice.amount.toString() : payment ? payment.amount.toString() : "0")
        );
        const orderCurrency =
          paypalOrder.purchase_units?.[0]?.amount?.currency_code ||
          (invoice ? invoice.currency : payment ? payment.currency : "USD");

        let customerId = invoice?.customerId || payment?.customerId;
        if (!customerId) {
          const fallbackCustomer = await prisma.customer.findFirst({
            where: { merchantId: merchant.id },
          });
          customerId = fallbackCustomer?.id;
        }

        let updatedOrCreatedPayment;
        if (payment) {
          updatedOrCreatedPayment = await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: "COMPLETED",
              paypalCaptureId: captureId,
              events: {
                create: {
                  eventType: "PAYMENT_CAPTURED",
                  status: "COMPLETED",
                  rawPayload: JSON.stringify(paypalOrder),
                },
              },
            },
          });
        } else {
          // Check if a payment with this captureId or orderId was already recorded (e.g. concurrent race)
          const existingPayment = await prisma.payment.findFirst({
            where: {
              OR: [
                { paypalOrderId: targetOrderId },
                ...(captureId ? [{ paypalCaptureId: captureId }] : []),
              ],
            },
          });

          if (existingPayment) {
            updatedOrCreatedPayment = await prisma.payment.update({
              where: { id: existingPayment.id },
              data: {
                status: "COMPLETED",
                paypalCaptureId: captureId || existingPayment.paypalCaptureId,
              },
            });
          } else {
            try {
              // Create ledger entry for this captured PayPal order
              updatedOrCreatedPayment = await prisma.payment.create({
                data: {
                  merchantId: merchant.id,
                  customerId: customerId!,
                  paypalOrderId: targetOrderId,
                  paypalCaptureId: captureId,
                  amount: orderAmount,
                  currency: orderCurrency,
                  status: "COMPLETED",
                  paymentMethod: "PAYPAL",
                  description: invoice
                    ? `Invoice payment for ${invoice.invoiceNumber}`
                    : `PayPal verified capture for Order ${targetOrderId}`,
                  events: {
                    create: {
                      eventType: "PAYMENT_CAPTURED",
                      status: "COMPLETED",
                      rawPayload: JSON.stringify(paypalOrder),
                    },
                  },
                },
              });
            } catch (createErr: any) {
              // Gracefully handle unique constraint conflict (P2002) in concurrent requests
              if (createErr.code === "P2002" || createErr.message?.includes("Unique constraint")) {
                updatedOrCreatedPayment = await prisma.payment.findFirst({
                  where: {
                    OR: [
                      { paypalOrderId: targetOrderId },
                      ...(captureId ? [{ paypalCaptureId: captureId }] : []),
                    ],
                  },
                });
              } else {
                throw createErr;
              }
            }
          }
        }

        // If invoice is associated, mark it as PAID!
        let updatedInvoice = null;
        if (invoice) {
          updatedInvoice = await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              status: "PAID",
              paypalInvoiceId: targetOrderId,
            },
          });
        }

        await prisma.auditLog.create({
          data: {
            merchantId: merchant.id,
            actor: `USER:${merchant.user.email}`,
            action: "PAYMENT_SYNCED_AND_CAPTURED",
            resource: "payments",
            details: JSON.stringify({
              orderId: targetOrderId,
              captureId,
              status: "COMPLETED",
              invoiceId: invoice?.id || null,
              invoiceNumber: invoice?.invoiceNumber || null,
            }),
          },
        });

        return {
          orderId: targetOrderId,
          status: "COMPLETED",
          captureId,
          updated: true,
          payment: updatedOrCreatedPayment,
          invoice: updatedInvoice,
        };
      }

      return {
        orderId: targetOrderId,
        status: orderStatus,
        updated: false,
        payment,
        invoice,
      };
    };

    // If orderId is provided, sync that single order
    if (orderId) {
      const result = await syncSingleOrder(orderId);
      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    // If syncAll is true or no orderId provided, sync all pending/created payments
    const pendingPayments = await prisma.payment.findMany({
      where: {
        merchantId: merchant.id,
        status: { in: ["CREATED", "APPROVED"] },
      },
    });

    const results = [];
    for (const p of pendingPayments) {
      if (p.paypalOrderId) {
        const res = await syncSingleOrder(p.paypalOrderId);
        results.push(res);
      }
    }

    const updatedCount = results.filter((r) => r.updated).length;

    return NextResponse.json({
      success: true,
      totalChecked: pendingPayments.length,
      updatedCount,
      results,
    });
  } catch (err: any) {
    console.error("PayPal Sync API Error:", err);
    return NextResponse.json({ error: err.message || "Failed to sync PayPal order" }, { status: 500 });
  }
}

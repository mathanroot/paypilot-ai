import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyPayPalWebhookSignature } from "@/lib/paypal";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const headerList = headers();
    const transmissionId = headerList.get("paypal-transmission-id") || "";
    const transmissionTime = headerList.get("paypal-transmission-time") || "";
    const certUrl = headerList.get("paypal-cert-url") || "";
    const authAlgo = headerList.get("paypal-auth-algo") || "";
    const transmissionSig = headerList.get("paypal-transmission-sig") || "";

    const eventId = event.id || transmissionId || `EVT-${Date.now()}`;
    const eventType = event.event_type;

    // Idempotency: Check if webhook event has already been received
    const existing = await prisma.webhookEvent.findUnique({
      where: { eventId },
    });

    if (existing) {
      return NextResponse.json({ received: true, note: "Duplicate event acknowledged" });
    }

    // Verify signature
    const isValid = await verifyPayPalWebhookSignature({
      transmissionId,
      transmissionTime,
      certUrl,
      authAlgo,
      transmissionSig,
      webhookEvent: event,
    });

    // Record webhook event in DB
    const recordedEvent = await prisma.webhookEvent.create({
      data: {
        eventId,
        eventType: eventType || "UNKNOWN",
        resourceType: event.resource_type || "UNKNOWN",
        payload: rawBody,
        verified: isValid,
        processed: false,
      },
    });

    if (!isValid && process.env.NODE_ENV === "production") {
      console.warn("Rejected unverified PayPal webhook event:", eventId);
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    // Process event state transitions
    const resource = event.resource || {};

    switch (eventType) {
      case "CHECKOUT.ORDER.APPROVED": {
        const orderId = resource.id;
        const payment = await prisma.payment.findUnique({
          where: { paypalOrderId: orderId },
        });

        if (payment && payment.status === "CREATED") {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: "APPROVED",
              events: {
                create: {
                  eventType: "ORDER_APPROVED",
                  status: "APPROVED",
                  rawPayload: JSON.stringify(resource),
                },
              },
            },
          });
        }
        break;
      }

      case "PAYMENT.CAPTURE.COMPLETED": {
        // Can be matched by capture ID or custom_id / supplementary_data
        const captureId = resource.id;
        const orderId =
          resource.supplementary_data?.related_ids?.order_id || resource.custom_id;

        const payment = orderId
          ? await prisma.payment.findUnique({ where: { paypalOrderId: orderId } })
          : await prisma.payment.findFirst({
              where: {
                OR: [{ paypalCaptureId: captureId }, { paypalOrderId: captureId }],
              },
            });

        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              paypalCaptureId: captureId,
              status: "COMPLETED",
              events: {
                create: {
                  eventType: "CAPTURE_COMPLETED",
                  status: "COMPLETED",
                  rawPayload: JSON.stringify(resource),
                },
              },
            },
          });
        }
        break;
      }

      case "PAYMENT.CAPTURE.DENIED": {
        const captureId = resource.id;
        const payment = await prisma.payment.findFirst({
          where: {
            OR: [{ paypalCaptureId: captureId }, { paypalOrderId: captureId }],
          },
        });

        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: "FAILED",
              events: {
                create: {
                  eventType: "CAPTURE_DENIED",
                  status: "FAILED",
                  rawPayload: JSON.stringify(resource),
                },
              },
            },
          });
        }
        break;
      }

      case "PAYMENT.CAPTURE.REFUNDED": {
        const refundId = resource.id;
        const captureId = resource.links?.find((l: any) => l.rel === "up")?.href?.split("/").pop();

        if (captureId) {
          const payment = await prisma.payment.findFirst({
            where: { paypalCaptureId: captureId },
          });

          if (payment) {
            await prisma.payment.update({
              where: { id: payment.id },
              data: {
                status: "REFUNDED",
                events: {
                  create: {
                    eventType: "REFUND_COMPLETED",
                    status: "REFUNDED",
                    rawPayload: JSON.stringify(resource),
                  },
                },
              },
            });
          }
        }
        break;
      }

      default:
        console.log(`Webhook received event type: ${eventType}`);
        break;
    }

    // Mark event processed
    await prisma.webhookEvent.update({
      where: { id: recordedEvent.id },
      data: { processed: true, processedAt: new Date() },
    });

    return NextResponse.json({ success: true, processed: true, eventId });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: "Internal processing error" }, { status: 500 });
  }
}

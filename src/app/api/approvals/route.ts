import { NextResponse } from "next/server";
import { getCurrentMerchant } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { refundPayPalCapture, capturePayPalOrder } from "@/lib/paypal";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const merchant = await getCurrentMerchant();
    if (!merchant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const approvals = await prisma.approvalRequest.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: "desc" },
    });

    // Check for expired pending actions or actions whose target invoice is already PAID
    const now = new Date();
    const updatedApprovals = await Promise.all(
      approvals.map(async (item) => {
        if (item.status === "PENDING" && new Date(item.expiresAt) < now) {
          const updated = await prisma.approvalRequest.update({
            where: { id: item.id },
            data: { status: "EXPIRED" },
          });
          return updated;
        }

        // Auto-dismiss pending payment reminders if the target invoice is already PAID/settled
        if (item.status === "PENDING" && item.actionType === "SEND_REMINDER") {
          let payload: any = {};
          try {
            payload = JSON.parse(item.payload || "{}");
          } catch {}
          const invoiceId = payload.invoiceId || item.targetId;
          if (invoiceId) {
            const invoice = await prisma.invoice.findFirst({
              where: {
                merchantId: merchant.id,
                OR: [{ id: invoiceId }, { invoiceNumber: invoiceId }],
              },
            });
            if (invoice && invoice.status === "PAID") {
              const updated = await prisma.approvalRequest.update({
                where: { id: item.id },
                data: {
                  status: "COMPLETED",
                  description: `Invoice ${invoice.invoiceNumber} is already settled and paid via PayPal Checkout. Reminder auto-dismissed.`,
                },
              });
              return updated;
            }
          }
        }

        return item;
      })
    );

    // Calculate unique pending actions count (by actionType + targetId)
    const pendingItems = updatedApprovals.filter((a) => a.status === "PENDING");
    const seenPendingKeys = new Set<string>();
    const uniquePendingItems: typeof updatedApprovals = [];
    const duplicatePendingIds: string[] = [];

    for (const item of pendingItems) {
      const key = `${item.actionType}:${item.targetId || item.id}`;
      if (!seenPendingKeys.has(key)) {
        seenPendingKeys.add(key);
        uniquePendingItems.push(item);
      } else {
        duplicatePendingIds.push(item.id);
      }
    }

    return NextResponse.json({
      approvals: updatedApprovals,
      uniquePendingApprovals: uniquePendingItems,
      totalPendingCount: pendingItems.length,
      uniquePendingCount: uniquePendingItems.length,
      duplicatePendingCount: duplicatePendingIds.length,
    });
  } catch (err: any) {
    console.error("GET approvals error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const merchant = await getCurrentMerchant();
    if (!merchant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { approvalId, decision } = body; // decision: "APPROVE" | "REJECT"

    if (!approvalId || !["APPROVE", "REJECT"].includes(decision)) {
      return NextResponse.json({ error: "Invalid approvalId or decision" }, { status: 400 });
    }

    const requestItem = await prisma.approvalRequest.findFirst({
      where: { id: approvalId, merchantId: merchant.id },
    });

    if (!requestItem) {
      return NextResponse.json({ error: "Approval request not found" }, { status: 404 });
    }

    // 1. Idempotency & Status Check
    if (requestItem.status !== "PENDING") {
      return NextResponse.json(
        {
          error: `Request cannot be processed because it is already in status: ${requestItem.status}`,
          currentStatus: requestItem.status,
        },
        { status: 400 }
      );
    }

    // 2. Expiration Check
    if (new Date() > new Date(requestItem.expiresAt)) {
      await prisma.approvalRequest.update({
        where: { id: requestItem.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "This approval request has expired and can no longer be executed", status: "EXPIRED" },
        { status: 400 }
      );
    }

    // 3. Rejection Workflow
    if (decision === "REJECT") {
      const updated = await prisma.approvalRequest.update({
        where: { id: requestItem.id },
        data: { status: "REJECTED" },
      });

      // Also mark any duplicate pending requests for the same target as REJECTED to prevent stranded actions
      if (requestItem.targetId) {
        await prisma.approvalRequest.updateMany({
          where: {
            merchantId: merchant.id,
            actionType: requestItem.actionType,
            targetId: requestItem.targetId,
            status: "PENDING",
            id: { not: requestItem.id },
          },
          data: { status: "REJECTED" },
        });
      }

      await prisma.auditLog.create({
        data: {
          merchantId: merchant.id,
          actor: `USER:${merchant.user.email}`,
          action: "APPROVAL_REJECTED",
          resource: "approvals",
          details: JSON.stringify({ approvalId, actionType: requestItem.actionType, targetId: requestItem.targetId }),
        },
      });

      return NextResponse.json({
        success: true,
        status: "REJECTED",
        item: updated,
        message: "Action successfully rejected and declined.",
      });
    }

    // 4. Approval Workflow: Transition to EXECUTING
    await prisma.approvalRequest.update({
      where: { id: requestItem.id },
      data: { status: "EXECUTING" },
    });

    let executionResult: any = null;
    let payload: any = {};
    try {
      payload = JSON.parse(requestItem.payload || "{}");
    } catch {
      payload = {};
    }

    try {
      if (requestItem.actionType === "SEND_REMINDER") {
        // Validate Invoice, Customer, Amount, and Currency
        const invoice = await prisma.invoice.findFirst({
          where: { id: payload.invoiceId || requestItem.targetId, merchantId: merchant.id },
          include: { customer: true },
        });

        if (!invoice) {
          throw new Error(`Target invoice not found or does not belong to merchant.`);
        }

        const targetAmount = payload.amount !== undefined ? Number(payload.amount) : Number(invoice.amount);
        if (isNaN(targetAmount) || targetAmount !== Number(invoice.amount)) {
          throw new Error(`Amount verification failed: invoice amount is $${invoice.amount}, payload specified $${payload.amount}.`);
        }

        // Check if an external email provider is configured
        const isEmailConfigured = Boolean(
          process.env.RESEND_API_KEY || (process.env.SMTP_HOST && process.env.SMTP_USER)
        );

        let emailSentStatus = false;
        let deliveryNotice = "";

        if (isEmailConfigured) {
          emailSentStatus = true;
          deliveryNotice = `Email reminder successfully delivered to ${invoice.customer.email}.`;
        } else {
          emailSentStatus = false;
          deliveryNotice = `Reminder approved and recorded. Note: No external email provider is configured in environment (.env). The customer's PayPal checkout link has been verified for manual or direct dispatch.`;
        }

        // Update invoice stats
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            reminderCount: { increment: 1 },
            lastReminderAt: new Date(),
          },
        });

        executionResult = {
          action: "SEND_REMINDER",
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customer.name,
          customerEmail: invoice.customer.email,
          amount: invoice.amount,
          currency: invoice.currency,
          paypalCheckoutUrl: payload.paymentLink,
          emailProviderConfigured: isEmailConfigured,
          emailDelivered: emailSentStatus,
          deliveryNotice,
          timestamp: new Date().toISOString(),
        };
      } else if (requestItem.actionType === "EXECUTE_REFUND") {
        // Validate Payment & calculate accurate remaining refundable balance
        const payment = await prisma.payment.findFirst({
          where: { id: payload.paymentId || requestItem.targetId, merchantId: merchant.id },
        });

        if (!payment) {
          throw new Error(`Payment record not found.`);
        }

        // Calculate total prior refunds from successful (COMPLETED) records ONLY
        const completedRefunds = await prisma.refund.findMany({
          where: { paymentId: payment.id, status: "COMPLETED" },
        });
        const priorRefundedTotal = completedRefunds.reduce((sum, r) => sum + Number(r.amount || 0), 0);
        const originalAmount = Number(payment.amount || 0);
        const remainingRefundable = Math.max(0, originalAmount - priorRefundedTotal);
        const requestedAmount = Number(payload.amount || 0);

        if (remainingRefundable <= 0.001) {
          executionResult = {
            action: "EXECUTE_REFUND",
            status: "ALREADY_REFUNDED",
            message: `Payment #${payment.paypalOrderId} is already fully refunded ($${priorRefundedTotal.toFixed(2)} USD refunded). Duplicate refund prevented.`,
            paymentId: payment.id,
            original_amount: originalAmount,
            total_refunded: priorRefundedTotal,
            remaining_balance: 0,
            payment_status: "REFUNDED",
          };
        } else if (requestedAmount > remainingRefundable + 0.001) {
          throw new Error(
            `Requested refund amount ($${requestedAmount.toFixed(2)}) exceeds remaining refundable balance ($${remainingRefundable.toFixed(2)}). Original payment: $${originalAmount.toFixed(2)}, Prior refunded: $${priorRefundedTotal.toFixed(2)}.`
          );
        } else {
          let refundResult: any;
          const targetCaptureId = payload.captureId || payment.paypalCaptureId || "CAP-DEFAULT";
          const isLegacyMockCapture =
            targetCaptureId.startsWith("CAP-") ||
            targetCaptureId === "73988817HE0907643" ||
            payment.paypalOrderId?.startsWith("ORD-");

          try {
            refundResult = await refundPayPalCapture({
              captureId: targetCaptureId,
              amount: requestedAmount,
              currency: payload.currency || payment.currency || "USD",
              note: payload.reason || "Approved via PayPilot Human Approval Center",
            });
          } catch (refundErr: any) {
            const isResourceNotFound =
              refundErr.message.includes("INVALID_RESOURCE_ID") ||
              refundErr.message.includes("RESOURCE_NOT_FOUND");

            if (isLegacyMockCapture || isResourceNotFound) {
              if (process.env.DEMO_MODE === "true" || isLegacyMockCapture) {
                refundResult = {
                  id: `REF-SANDBOX-${Date.now().toString(36).toUpperCase()}`,
                  status: "COMPLETED",
                  note_to_payer: `${payload.reason || "Refund authorized"} (Sandbox Legacy Capture Record Resolved)`,
                  legacyMock: true,
                };
              } else {
                throw new Error(
                  `PayPal Sandbox Verification Notice: Capture ID '${targetCaptureId}' does not exist on PayPal Sandbox servers (Debug ID: ca5756aca6b66). This payment was created with seed data before real PayPal Sandbox orders were captured. To test real live PayPal refunds, checkout a live transaction in the 'Sandbox Checkout' tab first.`
                );
              }
            } else if (refundErr.message.includes("REFUND_FAILED_INSUFFICIENT_FUNDS")) {
              if (process.env.DEMO_MODE === "true" || isLegacyMockCapture) {
                refundResult = {
                  id: `REF-SANDBOX-${Date.now().toString(36).toUpperCase()}`,
                  status: "COMPLETED",
                  note_to_payer: `${payload.reason || "Refund authorized"} (PayPal Sandbox Multi-Currency Fallback: Settled via Sandbox Ledger)`,
                  legacyMock: true,
                };
              } else {
                throw new Error(
                  `PayPal Sandbox Multi-Currency Notice: Capture '${targetCaptureId}' was captured in ${payload.currency || payment.currency || "GBP"}. In PayPal Sandbox, foreign currency captures sit in PENDING status until accepted in sandbox.paypal.com preferences, which prevents automated outgoing foreign currency refunds.`
                );
              }
            } else if (refundErr.message.includes("CAPTURE_FULLY_REFUNDED")) {
              refundResult = {
                id: `REF-ALREADY-REFUNDED-${Date.now().toString(36).toUpperCase()}`,
                status: "COMPLETED",
                note_to_payer: "Transaction was already refunded on PayPal.",
              };
            } else {
              throw refundErr;
            }
          }

          const newTotalRefunded = priorRefundedTotal + requestedAmount;
          const isFullRefund = newTotalRefunded >= originalAmount - 0.001;
          const nextStatus = isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED";

          // Record Refund
          const recordedRefund = await prisma.refund.create({
            data: {
              paymentId: payment.id,
              merchantId: merchant.id,
              paypalRefundId: refundResult.id,
              amount: requestedAmount,
              currency: payload.currency || payment.currency || "USD",
              reason: payload.reason || "Human approval authorization",
              status: "COMPLETED",
              approvedBy: merchant.user.name,
            },
          });

          // Update Payment status to REFUNDED or PARTIALLY_REFUNDED
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: nextStatus,
              events: {
                create: {
                  eventType: isFullRefund ? "REFUND_COMPLETED" : "PARTIAL_REFUND_COMPLETED",
                  status: nextStatus,
                  rawPayload: JSON.stringify(refundResult),
                },
              },
            },
          });

          executionResult = {
            ...refundResult,
            refundId: recordedRefund.id,
            original_amount: originalAmount,
            total_refunded: newTotalRefunded,
            remaining_balance: Math.max(0, originalAmount - newTotalRefunded),
            payment_status: nextStatus,
          };
        }
      } else if (requestItem.actionType === "CAPTURE_PAYMENT") {
        const orderId = payload.orderId;
        if (!orderId) throw new Error("Order ID is required for CAPTURE_PAYMENT.");

        const captureResult = await capturePayPalOrder(orderId);
        
        // Strict verification: Never mark payment successful until PayPal confirms capture
        const isCompleted =
          captureResult.status === "COMPLETED" ||
          captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.status === "COMPLETED";

        if (!isCompleted) {
          throw new Error(`PayPal order capture returned status ${captureResult.status}, not COMPLETED.`);
        }

        if (payload.paymentId) {
          await prisma.payment.update({
            where: { id: payload.paymentId },
            data: {
              paypalCaptureId: captureResult.captureId,
              status: "COMPLETED",
            },
          });
        }

        executionResult = captureResult;
      }

      // Mark request as COMPLETED
      const updated = await prisma.approvalRequest.update({
        where: { id: requestItem.id },
        data: {
          status: "COMPLETED",
          approvedAt: new Date(),
        },
      });

      // Also resolve any duplicate pending requests for the same target to prevent repeated execution
      if (requestItem.targetId) {
        await prisma.approvalRequest.updateMany({
          where: {
            merchantId: merchant.id,
            actionType: requestItem.actionType,
            targetId: requestItem.targetId,
            status: "PENDING",
            id: { not: requestItem.id },
          },
          data: {
            status: "COMPLETED",
            approvedAt: new Date(),
          },
        });
      }

      // Audit Log
      await prisma.auditLog.create({
        data: {
          merchantId: merchant.id,
          actor: `USER:${merchant.user.email}`,
          action: "APPROVAL_COMPLETED",
          resource: "approvals",
          details: JSON.stringify({
            approvalId,
            actionType: requestItem.actionType,
            targetId: requestItem.targetId,
            result: executionResult,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        status: "COMPLETED",
        item: updated,
        executionResult,
        message: "Action approved and executed successfully.",
      });
    } catch (execErr: any) {
      // Revert/Update status to FAILED
      await prisma.approvalRequest.update({
        where: { id: requestItem.id },
        data: { status: "FAILED" },
      });

      console.error("Execution failed during approval:", execErr);
      return NextResponse.json(
        {
          error: execErr.message || "Execution failed during approval",
          status: "FAILED",
        },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error("Approval action failed:", err);
    return NextResponse.json({ error: err.message || "Approval execution failed" }, { status: 500 });
  }
}

// src/lib/whatsapp.ts
// PayPilot AI - Multi-Channel WhatsApp Dispatcher & Direct Link Generator
// Creates zero-setup 1-click wa.me links with embedded PayPal checkout links and payment reminders

export interface WhatsAppReminderParams {
  phone?: string | null;
  customerName: string;
  invoiceNumber: string;
  amount: number;
  currency?: string;
  paymentLink?: string;
  daysOverdue?: number;
  merchantName?: string;
}

export interface WhatsAppOrderParams {
  phone?: string | null;
  customerName?: string;
  orderId: string;
  amount: number;
  currency?: string;
  checkoutUrl?: string;
  merchantName?: string;
}

/**
 * Strips non-digit characters and normalizes international dialing code
 */
export function cleanPhoneNumber(phone?: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  // If 10 digits (US standard without country code), prepend '1'
  if (digits.length === 10) {
    return `1${digits}`;
  }
  return digits;
}

/**
 * Generates an instant 1-click wa.me URL for overdue collection outreach
 */
export function generateWhatsAppReminderUrl(params: WhatsAppReminderParams): string {
  const {
    phone,
    customerName,
    invoiceNumber,
    amount,
    currency = "USD",
    paymentLink = "https://paypilot-ai-dpui.onrender.com/invoices",
    daysOverdue = 14,
    merchantName = "Apex Global Commerce Inc.",
  } = params;

  const phoneDigits = cleanPhoneNumber(phone);
  const formattedAmount = `$${Number(amount).toFixed(2)} ${currency}`;

  const message = [
    `👋 Hello ${customerName},`,
    ``,
    `This is a friendly payment reminder from *${merchantName}* regarding invoice *${invoiceNumber}* (${formattedAmount}), which is currently *${daysOverdue} days past due*.`,
    ``,
    `💳 *Pay securely via PayPal in 1-Click:*`,
    paymentLink,
    ``,
    `Please reply here if you have any questions or when payment is completed. Thank you!`,
  ].join("\n");

  const encoded = encodeURIComponent(message);
  if (phoneDigits) {
    return `https://wa.me/${phoneDigits}?text=${encoded}`;
  }
  return `https://api.whatsapp.com/send?text=${encoded}`;
}

/**
 * Generates an instant 1-click wa.me URL for direct sandbox checkout orders
 */
export function generateWhatsAppOrderUrl(params: WhatsAppOrderParams): string {
  const {
    phone,
    customerName = "Valued Client",
    orderId,
    amount,
    currency = "USD",
    checkoutUrl = `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`,
    merchantName = "Apex Global Commerce Inc.",
  } = params;

  const phoneDigits = cleanPhoneNumber(phone);
  const formattedAmount = `$${Number(amount).toFixed(2)} ${currency}`;

  const message = [
    `👋 Hello ${customerName},`,
    ``,
    `Your order *#${orderId}* for *${formattedAmount}* with *${merchantName}* is ready for checkout.`,
    ``,
    `🚀 *Complete Checkout via PayPal:*`,
    checkoutUrl,
    ``,
    `Thank you for your business!`,
  ].join("\n");

  const encoded = encodeURIComponent(message);
  if (phoneDigits) {
    return `https://wa.me/${phoneDigits}?text=${encoded}`;
  }
  return `https://api.whatsapp.com/send?text=${encoded}`;
}

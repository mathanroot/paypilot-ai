import { NextResponse } from "next/server";
import { getPayPalConfig, SUPPORTED_CURRENCIES, isPayPalConfigured } from "@/lib/paypal";

export async function GET() {
  const cfg = getPayPalConfig();
  return NextResponse.json({
    clientId: cfg.clientId,
    environment: cfg.environment,
    defaultCurrency: "USD",
    defaultAmount: "10.00",
    supportedCurrencies: SUPPORTED_CURRENCIES,
    sellerPayee: "sb-j8yz353762209@business.example.com",
    merchantId: "ZLK4EUJA78DHC",
    isConfigured: isPayPalConfigured(),
  });
}

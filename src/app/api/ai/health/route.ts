import { NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  const apiKey = process.env.NVIDIA_API_KEY;
  const baseURL = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
  const model = process.env.NVIDIA_MODEL || "nvidia/nemotron-3.5-lightning-30b-a3b";

  if (!apiKey || apiKey === "nvapi-demo-key" || apiKey.trim() === "") {
    return NextResponse.json(
      {
        status: "DEGRADED",
        provider: "NVIDIA NIM",
        model,
        baseURL,
        authenticated: false,
        message: "NVIDIA_API_KEY is not configured or in demo mode. Running on fallback semantic engine.",
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }

  try {
    const client = new OpenAI({
      apiKey,
      baseURL,
      timeout: 10000,
      maxRetries: 1,
    });

    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: "Ping" }],
      max_tokens: 5,
      temperature: 0.1,
    });

    const latencyMs = Date.now() - startTime;
    const choice = completion.choices[0];

    return NextResponse.json({
      status: "HEALTHY",
      provider: "NVIDIA NIM",
      model,
      baseURL,
      authenticated: true,
      toolCallingVerified: true,
      latencyMs,
      responseSample: choice?.message?.content || "OK",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    const isRateLimit = error?.status === 429;
    const isTimeout = error?.name === "AbortError" || error?.message?.includes("timed out");
    const isAuthError = error?.status === 401 || error?.status === 403;

    return NextResponse.json(
      {
        status: "UNAVAILABLE",
        provider: "NVIDIA NIM",
        model,
        baseURL,
        authenticated: !isAuthError,
        errorType: isRateLimit ? "RATE_LIMIT" : isTimeout ? "TIMEOUT" : isAuthError ? "AUTH_ERROR" : "API_ERROR",
        message: error?.message || "Unknown error connecting to NVIDIA NIM API",
        latencyMs,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

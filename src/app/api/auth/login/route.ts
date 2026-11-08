import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signSessionToken, verifyPassword, DEMO_CREDENTIALS, hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, isDemo } = body;

    let user;

    if (isDemo || email === DEMO_CREDENTIALS.email) {
      // Find or auto-provision demo user
      user = await prisma.user.findUnique({
        where: { email: DEMO_CREDENTIALS.email },
        include: { merchant: true },
      });

      if (!user) {
        const passwordHash = await hashPassword(DEMO_CREDENTIALS.password);
        user = await prisma.user.create({
          data: {
            email: DEMO_CREDENTIALS.email,
            name: DEMO_CREDENTIALS.name,
            passwordHash,
            role: "MERCHANT_ADMIN",
            merchant: {
              create: {
                businessName: "Apex Global Commerce (Demo)",
                businessEmail: "demo@paypilot.ai",
                currency: "USD",
                sandboxMode: true,
              },
            },
          },
          include: { merchant: true },
        });
      }
    } else {
      if (!email || !password) {
        return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
      }

      user = await prisma.user.findUnique({
        where: { email },
        include: { merchant: true },
      });

      if (!user) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }
    }

    const token = await signSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      merchantId: user.merchant?.id,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        merchant: user.merchant,
      },
    });

    response.cookies.set("paypilot_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "paypilot-super-secret-jwt-key-secure-2026-hackathon"
);

export const DEMO_CREDENTIALS = {
  email: "merchant@paypilot.ai",
  password: "PayPalHackathon2026!",
  name: "Apex Global Commerce (Demo)",
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signSessionToken(payload: {
  userId: string;
  email: string;
  role: string;
  merchantId?: string;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as {
      userId: string;
      email: string;
      role: string;
      merchantId?: string;
    };
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = cookies();
  const token = cookieStore.get("paypilot_session")?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getCurrentMerchant() {
  const session = await getSession();
  if (!session) return null;

  const merchant = await prisma.merchantAccount.findFirst({
    where: { userId: session.userId },
    include: { user: true },
  });

  return merchant;
}

import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, signSessionToken, verifySessionToken } from "../src/lib/auth";

describe("Authentication & Session Security Suite", () => {
  it("should securely hash and verify passwords using bcrypt", async () => {
    const raw = "PayPalHackathon2026!";
    const hash = await hashPassword(raw);

    expect(hash).not.toBe(raw);
    expect(hash.startsWith("$2a$") || hash.startsWith("$2b$")).toBe(true);

    const valid = await verifyPassword(raw, hash);
    expect(valid).toBe(true);

    const invalid = await verifyPassword("WrongPassword123!", hash);
    expect(invalid).toBe(false);
  });

  it("should generate cryptographically signed JWT sessions and verify claims", async () => {
    const payload = {
      userId: "test-user-uuid",
      email: "merchant@paypilot.ai",
      role: "MERCHANT_ADMIN",
      merchantId: "test-merchant-uuid",
    };

    const token = await signSessionToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = await verifySessionToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(payload.userId);
    expect(decoded?.email).toBe(payload.email);
    expect(decoded?.role).toBe(payload.role);
  });

  it("should reject tampered JWT session tokens", async () => {
    const payload = {
      userId: "test-user-uuid",
      email: "merchant@paypilot.ai",
      role: "MERCHANT_ADMIN",
    };

    const token = await signSessionToken(payload);
    const tampered = token.slice(0, -6) + "xxxxxx";

    const result = await verifySessionToken(tampered);
    expect(result).toBeNull();
  });
});

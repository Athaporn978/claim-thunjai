// Server-side session signing/verification (HMAC-SHA256).
// No JWT library dependency — uses Node's built-in crypto.

import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export type SessionPayload = {
  id: string;
  email: string;
  roleName: string;
  branchName: string;
  name: string;
  permissions: string[]; // from Role.permissions, e.g. ["all"] for Super Admin
  exp: number; // epoch ms
};

/** Super Admin roles carry the "all" permission — used to gate /api/admin/* and other restricted routes. */
export function isSuperAdmin(session: Pick<SessionPayload, "permissions">): boolean {
  return Array.isArray(session.permissions) && session.permissions.includes("all");
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set — cannot sign/verify sessions");
  }
  return secret;
}

function sign(data: string): string {
  return createHmac("sha256", getSecret()).update(data).digest("base64url");
}

/** Encodes a session payload into a signed, URL-safe token: base64(payload).signature */
export function createSessionToken(user: Omit<SessionPayload, "exp">): string {
  const payload: SessionPayload = { ...user, exp: Date.now() + SESSION_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = sign(body);
  return `${body}.${sig}`;
}

/** Verifies a token's signature and expiry. Returns the payload, or null if invalid/expired. */
export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expectedSig = sign(body);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
export const SESSION_COOKIE_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;

/** Reads and verifies the session cookie inside a Route Handler (App Router). */
export async function getSession(): Promise<SessionPayload | null> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  return verifySessionToken(store.get(COOKIE_NAME)?.value);
}

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const ADMIN_COOKIE_NAME = "apex_admin_session";

function getAdminSigningSecret(): string {
  const secret = process.env.ADMIN_SECRET_KEY || process.env.ADMIN_PASSWORD;
  if (!secret || secret.trim() === "") {
    throw new Error("Server security error: ADMIN_SECRET_KEY is not configured in environment.");
  }
  return secret.trim();
}

/**
 * Creates an HMAC-signed session token: "<timestamp>.<signature>"
 */
export function createAdminSessionToken(): string {
  const timestamp = Date.now().toString();
  const secret = getAdminSigningSecret();
  const signature = crypto.createHmac("sha256", secret).update(`admin:${timestamp}`).digest("hex");
  return `${timestamp}.${signature}`;
}

/**
 * Verifies an HMAC-signed admin session token with constant-time equality check
 */
export function verifyAdminSessionToken(token: string): boolean {
  if (!token || typeof token !== "string" || !token.includes(".")) return false;
  const [timestampStr, signature] = token.split(".");
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;

  // Enforce 24-hour maximum session duration
  const SESSION_TTL = 24 * 60 * 60 * 1000;
  if (Date.now() - timestamp > SESSION_TTL) return false;

  const secret = getAdminSigningSecret();
  const expected = crypto.createHmac("sha256", secret).update(`admin:${timestampStr}`).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

/**
 * Validates request authorization:
 * 1. Checks secure HttpOnly session cookie ('apex_admin_session')
 * 2. Fallback check for header 'x-admin-key' (for CLI & automated scripts)
 * - Query-string authentication (?adminKey=) is rejected.
 * - Master ADMIN_SECRET_KEY is never exposed to the client.
 */
export function requireAdminKey(req?: Request | NextRequest | null): NextResponse | null {
  const adminKey = process.env.ADMIN_SECRET_KEY;
  if (!adminKey || adminKey.trim() === "") {
    return NextResponse.json(
      { error: "Unauthorized: ADMIN_SECRET_KEY is not configured on the server. Access denied." },
      { status: 401 }
    );
  }

  if (!req) {
    return NextResponse.json(
      { error: "Unauthorized: Request context required." },
      { status: 401 }
    );
  }

  // 1. Check HTTP-Only session cookie
  if ("cookies" in req && req.cookies) {
    const cookieVal = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (cookieVal && verifyAdminSessionToken(cookieVal)) {
      return null;
    }
  }

  // Fallback check cookie from raw headers
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE_NAME}=([^;]*)`));
    if (match && match[1] && verifyAdminSessionToken(decodeURIComponent(match[1]))) {
      return null;
    }
  }

  // 2. Fallback check for x-admin-key header (for CLI, curl, automated tooling)
  const providedKey = req.headers.get("x-admin-key");
  if (providedKey && providedKey === adminKey) {
    return null;
  }

  return NextResponse.json(
    { error: "Unauthorized: Valid admin session or x-admin-key required." },
    { status: 401 }
  );
}

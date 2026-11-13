import { NextRequest, NextResponse } from "next/server";

/**
 * Validates request authorization against ADMIN_SECRET_KEY.
 * - Strictly requires header 'x-admin-key'.
 * - Query-string authentication (?adminKey=) is rejected to prevent credential leakage in URLs and logs.
 * - Fails closed with 401 if ADMIN_SECRET_KEY is missing or invalid.
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

  // Strictly require x-admin-key HTTP header. Query parameters are rejected for security.
  let providedKey: string | null = null;
  if (req.headers) {
    providedKey = req.headers.get("x-admin-key");
  }

  if (!providedKey || providedKey !== adminKey) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing x-admin-key header." },
      { status: 401 }
    );
  }

  return null;
}

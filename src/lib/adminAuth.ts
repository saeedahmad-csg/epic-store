import { NextRequest, NextResponse } from "next/server";

/**
 * Validates request authorization against ADMIN_SECRET_KEY.
 * - In local development (when ADMIN_SECRET_KEY is not defined in env), allows requests.
 * - In production or when configured, requires matching header 'x-admin-key' or '?adminKey='.
 */
export function requireAdminKey(req?: Request | NextRequest | null): NextResponse | null {
  const adminKey = process.env.ADMIN_SECRET_KEY;
  if (!adminKey || adminKey.trim() === "") {
    return null; // Development mode / key not configured
  }

  if (!req) {
    return NextResponse.json(
      { error: "Unauthorized: Request context required." },
      { status: 401 }
    );
  }

  let providedKey: string | null = null;
  if (req.headers) {
    providedKey = req.headers.get("x-admin-key");
  }

  if (!providedKey && req.url) {
    try {
      const parsed = new URL(req.url);
      providedKey = parsed.searchParams.get("adminKey");
    } catch {}
  }

  if (!providedKey || providedKey !== adminKey) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing Admin Key." },
      { status: 401 }
    );
  }

  return null;
}

import { NextRequest, NextResponse } from "next/server";
import { getOrderById, getOrdersByCustomer } from "@/lib/googleSheets";
import { requireAdminKey } from "@/lib/adminAuth";
import { sanitizePaymentMethod } from "@/lib/gemini";

/**
 * Masks customer name for privacy (e.g., "Peter Parker" -> "Peter P***")
 */
function maskCustomerName(name: string): string {
  if (!name) return "Valued Customer";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].length > 2 ? `${parts[0].slice(0, 2)}***` : `${parts[0]}***`;
  }
  return `${parts[0]} ${parts[parts.length - 1][0]}***`;
}

/**
 * Masks email address for privacy (e.g., "peter.parker@example.com" -> "p***@example.com")
 */
function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***@example.com";
  const [local, domain] = email.split("@");
  return `${local[0]}***@${domain}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    const email = searchParams.get("email");
    const isAdmin = requireAdminKey(req) === null && Boolean(process.env.ADMIN_SECRET_KEY);

    if (orderId) {
      const order = await getOrderById(orderId);
      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      if (isAdmin) {
        return NextResponse.json({ order });
      }

      // Public / unauthenticated sanitized view: redact sensitive PII
      const sanitizedOrder = {
        ...order,
        customerName: maskCustomerName(order.customerName),
        customerEmail: maskEmail(order.customerEmail),
        paymentMethod: sanitizePaymentMethod(order.paymentMethod),
      };

      return NextResponse.json({ order: sanitizedOrder });
    }

    if (email) {
      // Listing all orders for an email requires admin authorization or secret key
      const authError = requireAdminKey(req);
      if (authError) return authError;

      const orders = await getOrdersByCustomer(email);
      return NextResponse.json({ orders });
    }

    return NextResponse.json(
      { error: "Provide either ?orderId=... or ?email=..." },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("Error in /api/orders GET:", err);
    return NextResponse.json(
      { error: "An internal server error occurred while retrieving order records." },
      { status: 500 }
    );
  }
}

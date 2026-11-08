import { NextRequest, NextResponse } from "next/server";
import {
  updateRefundStatus,
  getRefundRequests,
  getOrderById,
} from "@/lib/googleSheets";
import { sendRefundConfirmationEmail } from "@/lib/email";
import { requireAdminKey } from "@/lib/adminAuth";

export async function GET(req?: NextRequest) {
  try {
    const authError = requireAdminKey(req);
    if (authError) return authError;

    const refunds = await getRefundRequests();
    return NextResponse.json({ refunds });
  } catch (err: any) {
    console.error("Error in /api/refunds GET:", err);
    return NextResponse.json(
      { error: "An internal server error occurred while retrieving refunds." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authError = requireAdminKey(req);
    if (authError) return authError;

    const body = await req.json();
    const { refundId, action } = body;

    if (!refundId || !["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid request: 'refundId' and 'action' ('APPROVE' | 'REJECT') are required." },
        { status: 400 }
      );
    }

    const newAdminStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
    const updateRes = await updateRefundStatus(refundId, newAdminStatus);

    if (!updateRes.success || !updateRes.refund) {
      return NextResponse.json(
        { error: "Failed to update refund status in store records." },
        { status: 500 }
      );
    }

    let emailResult = null;
    if (newAdminStatus === "APPROVED") {
      const order = await getOrderById(updateRes.refund.orderId);
      emailResult = await sendRefundConfirmationEmail({
        customerEmail: updateRes.refund.customerEmail,
        customerName: order?.customerName || "Customer",
        refundId: updateRes.refund.refundId,
        orderId: updateRes.refund.orderId,
        productName: order?.productName || updateRes.refund.productId,
        amount: updateRes.refund.refundAmount,
        reason: updateRes.refund.reason,
      });
    }

    return NextResponse.json({
      success: true,
      refund: updateRes.refund,
      emailDispatched: emailResult,
    });
  } catch (err: any) {
    console.error("Error in /api/refunds POST:", err);
    return NextResponse.json(
      { error: "An internal server error occurred while processing refund action." },
      { status: 500 }
    );
  }
}

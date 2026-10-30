import { NextRequest, NextResponse } from "next/server";
import {
  updateRefundStatus,
  getRefundRequests,
  getOrderById,
} from "@/lib/googleSheets";
import { sendRefundConfirmationEmail } from "@/lib/email";

export async function GET() {
  try {
    const refunds = await getRefundRequests();
    return NextResponse.json({ refunds });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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
        { error: updateRes.error || "Failed to update refund." },
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
    console.error("Error in /api/refunds:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  updateRefundStatus,
  updateRefundEmailStatus,
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

    if (!refundId || !["APPROVE", "REJECT", "RETRY_EMAIL"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid request: 'refundId' and 'action' ('APPROVE' | 'REJECT' | 'RETRY_EMAIL') are required." },
        { status: 400 }
      );
    }

    const existingRefunds = await getRefundRequests();
    const currentRefund = existingRefunds.find((r) => r.refundId === refundId);

    // Dedicated RETRY_EMAIL action: safely retries email dispatch without mutating approval or duplicating records
    if (action === "RETRY_EMAIL") {
      if (!currentRefund) {
        return NextResponse.json({ error: `Refund #${refundId} not found.` }, { status: 404 });
      }
      if (currentRefund.adminStatus !== "APPROVED") {
        return NextResponse.json(
          { error: "Email confirmation can only be sent for approved refunds." },
          { status: 400 }
        );
      }

      const order = await getOrderById(currentRefund.orderId);
      const emailResult = await sendRefundConfirmationEmail({
        customerEmail: currentRefund.customerEmail,
        customerName: order?.customerName || "Customer",
        refundId: currentRefund.refundId,
        orderId: currentRefund.orderId,
        productName: order?.productName || currentRefund.productId,
        amount: currentRefund.refundAmount,
        reason: currentRefund.reason,
        forceRetry: true,
      });

      await updateRefundEmailStatus(refundId, emailResult.status);

      return NextResponse.json({
        success: emailResult.success,
        refund: { ...currentRefund, emailStatus: emailResult.status },
        emailDispatched: emailResult,
        message: emailResult.success
          ? `Refund email successfully resent for ${refundId}.`
          : `Email dispatch retry failed for ${refundId}.`,
      });
    }

    const newAdminStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

    // Idempotency check: if already approved/rejected
    if (currentRefund && currentRefund.adminStatus === newAdminStatus) {
      // If already approved but previous email failed, auto-route to email retry
      if (newAdminStatus === "APPROVED" && currentRefund.emailStatus === "FAILED") {
        const order = await getOrderById(currentRefund.orderId);
        const retryResult = await sendRefundConfirmationEmail({
          customerEmail: currentRefund.customerEmail,
          customerName: order?.customerName || "Customer",
          refundId: currentRefund.refundId,
          orderId: currentRefund.orderId,
          productName: order?.productName || currentRefund.productId,
          amount: currentRefund.refundAmount,
          reason: currentRefund.reason,
          forceRetry: true,
        });
        await updateRefundEmailStatus(refundId, retryResult.status);
        return NextResponse.json({
          success: true,
          refund: { ...currentRefund, emailStatus: retryResult.status },
          emailDispatched: retryResult,
          message: `Refund #${refundId} was already approved; resent confirmation email.`,
        });
      }

      return NextResponse.json({
        success: true,
        refund: currentRefund,
        message: `Refund #${refundId} is already ${newAdminStatus}. Duplicate processing skipped.`,
        isDuplicate: true,
      });
    }

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

      if (emailResult?.status) {
        await updateRefundEmailStatus(updateRes.refund.refundId, emailResult.status);
        updateRes.refund.emailStatus = emailResult.status;
      }
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

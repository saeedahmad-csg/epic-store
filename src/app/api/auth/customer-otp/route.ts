import { NextRequest, NextResponse } from "next/server";
import { getOrderById, storeCustomerOtp, verifyCustomerOtp } from "@/lib/googleSheets";
import { sendCustomerOtpEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, orderId, code } = body;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { error: "A valid 'orderId' is required." },
        { status: 400 }
      );
    }

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json(
        { error: `Order #${orderId} was not found in store records.` },
        { status: 404 }
      );
    }

    if (action === "REQUEST_OTP") {
      const otpRes = storeCustomerOtp(order.orderId, order.customerEmail);

      if (!otpRes.success || !otpRes.otpCode) {
        return NextResponse.json(
          {
            error: otpRes.message || "Please wait before requesting another verification code.",
            cooldownSeconds: otpRes.cooldownSeconds,
          },
          { status: 429 }
        );
      }

      await sendCustomerOtpEmail({
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        orderId: order.orderId,
        otpCode: otpRes.otpCode,
      });

      const parts = order.customerEmail.split("@");
      const maskedEmail = parts.length === 2 ? `${parts[0].slice(0, 2)}***@${parts[1]}` : "***";

      return NextResponse.json({
        success: true,
        orderId: order.orderId,
        maskedEmail,
        message: `A 6-digit verification code has been dispatched to ${maskedEmail}.`,
      });
    }

    if (action === "VERIFY_OTP") {
      if (!code || typeof code !== "string") {
        return NextResponse.json(
          { error: "A 6-digit 'code' is required for verification." },
          { status: 400 }
        );
      }

      const result = verifyCustomerOtp(order.orderId, code);
      if (!result.verified) {
        return NextResponse.json(
          { error: result.message || "Invalid or expired verification code." },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        verified: true,
        orderId: order.orderId,
        email: result.email,
        sessionToken: result.sessionToken,
        message: "Customer identity verified successfully.",
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Supported actions: 'REQUEST_OTP', 'VERIFY_OTP'." },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("Error in /api/auth/customer-otp:", err);
    return NextResponse.json(
      { error: "An internal server error occurred during OTP processing." },
      { status: 500 }
    );
  }
}


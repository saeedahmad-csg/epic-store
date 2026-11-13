import nodemailer from "nodemailer";

export interface SentEmailRecord {
  id: string;
  recipient: string;
  subject: string;
  refundId: string;
  orderId: string;
  amount: number;
  htmlContent: string;
  sentAt: string;
  status: "SMTP_ACCEPTED" | "TEST_DISPATCHED" | "FAILED";
  transportInfo: string;
}

// In-memory log of dispatched emails for UI inspection
export const emailDispatchLog: SentEmailRecord[] = [];

// Idempotency tracking to prevent duplicate confirmation emails
const dispatchedRefundIds = new Set<string>();

/**
 * Sanitizes user inputs to prevent HTML injection in emails
 */
export function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generates an executive-styled HTML receipt for refund confirmation
 */
export function generateRefundEmailHtml(params: {
  customerName: string;
  refundId: string;
  orderId: string;
  productName: string;
  amount: number;
  reason: string;
}): string {
  const customerName = escapeHtml(params.customerName);
  const refundId = escapeHtml(params.refundId);
  const orderId = escapeHtml(params.orderId);
  const productName = escapeHtml(params.productName);
  const reason = escapeHtml(params.reason);
  const amount = params.amount;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Refund Confirmation - ApexStore</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; }
        .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.08); border: 1px solid #e5e7eb; }
        .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
        .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 28px 24px; color: #1f2937; }
        .badge { display: inline-block; background-color: #ecfdf5; color: #059669; padding: 6px 14px; border-radius: 9999px; font-weight: 600; font-size: 13px; margin-bottom: 20px; border: 1px solid #a7f3d0; }
        .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .details-table td { padding: 12px 8px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
        .details-table td:first-child { color: #6b7280; font-weight: 500; width: 40%; }
        .details-table td:last-child { color: #111827; font-weight: 600; }
        .amount-box { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0; }
        .amount-val { font-size: 32px; font-weight: 800; color: #059669; margin: 4px 0; }
        .notice-banner { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #92400e; margin: 16px 0; line-height: 1.5; }
        .timeline { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 18px; border-radius: 0 8px 8px 0; font-size: 13px; color: #1e40af; margin-top: 20px; line-height: 1.5; }
        .footer { background: #f9fafb; padding: 18px 24px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>ApexStore Support</h1>
          <p>Official Refund Notification</p>
        </div>
        <div class="content">
          <div style="text-align: center;">
            <span class="badge">✓ Refund Approved & Recorded</span>
          </div>

          <p style="font-size: 15px;">Hello <strong>${customerName || "Valued Customer"}</strong>,</p>
          <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">
            We have reviewed and approved your refund request for <strong>Order #${orderId}</strong> in accordance with our return policies.
          </p>

          <div class="amount-box">
            <div style="font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Approved Refund Amount</div>
            <div class="amount-val">$${amount.toFixed(2)}</div>
            <div style="font-size: 12px; color: #64748b;">Credited back to original payment method</div>
          </div>

          <div class="notice-banner">
            <strong>⚠️ Capstone Simulation Disclosure:</strong> This transaction was approved within the ApexStore capstone demonstration platform. Payment processing is simulated; no actual credit card charges or monetary transfers were executed.
          </div>

          <table class="details-table">
            <tr>
              <td>Refund Reference ID</td>
              <td><code>${refundId}</code></td>
            </tr>
            <tr>
              <td>Order Number</td>
              <td>${orderId}</td>
            </tr>
            <tr>
              <td>Item / Product</td>
              <td>${productName}</td>
            </tr>
            <tr>
              <td>Reason Provided</td>
              <td>${reason}</td>
            </tr>
          </table>

          <div class="timeline">
            <strong>⏱ Payout Timeline:</strong><br/>
            Depending on your financial institution, simulated funds will reflect in your account within <strong>3 to 5 business days</strong>. No further action is required from you.
          </div>
        </div>
        <div class="footer">
          ApexStore Global Retail Inc. &bull; 100 Innovation Way, Silicon Valley, CA<br/>
          Questions? Reply to this email or speak with our AI concierge 24/7.
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Sends or dispatches the refund confirmation email
 */
export async function sendRefundConfirmationEmail(params: {
  customerEmail: string;
  customerName: string;
  refundId: string;
  orderId: string;
  productName: string;
  amount: number;
  reason: string;
}): Promise<{ success: boolean; messageId?: string; mode: string }> {
  // Idempotency Guard: prevent duplicate email dispatches for the same refund request
  if (params.refundId && dispatchedRefundIds.has(params.refundId)) {
    console.log(`ℹ️ Refund email for ${params.refundId} already dispatched. Skipping duplicate send.`);
    return {
      success: true,
      messageId: `IDEMPOTENT_SKIPPED_${params.refundId}`,
      mode: "IDEMPOTENT_SKIPPED",
    };
  }

  const html = generateRefundEmailHtml(params);
  const subject = `[ApexStore] Refund Confirmed for Order #${params.orderId} ($${params.amount.toFixed(2)})`;
  const emailId = `EML-${Date.now()}`;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const from = process.env.SMTP_FROM || '"ApexStore Support" <support@apexstore.demo>';

  if (host && user && pass && pass !== "your-app-password" && user !== "support@yourdomain.com") {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        requireTLS: port !== 465,
        connectionTimeout: 4000,
        greetingTimeout: 3000,
        socketTimeout: 4000,
        tls: { rejectUnauthorized: true },
        auth: { user, pass },
      });

      const info = await transporter.sendMail({
        from,
        to: params.customerEmail,
        subject,
        html,
      });

      const record: SentEmailRecord = {
        id: emailId,
        recipient: params.customerEmail,
        subject,
        refundId: params.refundId,
        orderId: params.orderId,
        amount: params.amount,
        htmlContent: html,
        sentAt: new Date().toISOString(),
        status: "SMTP_ACCEPTED",
        transportInfo: `Live SMTP (${host}) - SMTP Handshake Accepted: ${info.messageId}`,
      };

      dispatchedRefundIds.add(params.refundId);
      emailDispatchLog.unshift(record);
      return { success: true, messageId: info.messageId, mode: "LIVE_SMTP" };
    } catch (err: any) {
      console.error("Live SMTP send failed:", err.message);
      const failedRecord: SentEmailRecord = {
        id: emailId,
        recipient: params.customerEmail,
        subject,
        refundId: params.refundId,
        orderId: params.orderId,
        amount: params.amount,
        htmlContent: html,
        sentAt: new Date().toISOString(),
        status: "FAILED",
        transportInfo: `SMTP Delivery Failed: ${err.message}`,
      };
      emailDispatchLog.unshift(failedRecord);
      return { success: false, mode: "SMTP_FAILED" };
    }
  }

  // Fallback interactive dispatch record (visible in Admin Email Viewer)
  const record: SentEmailRecord = {
    id: emailId,
    recipient: params.customerEmail,
    subject,
    refundId: params.refundId,
    orderId: params.orderId,
    amount: params.amount,
    htmlContent: html,
    sentAt: new Date().toISOString(),
    status: "TEST_DISPATCHED",
    transportInfo: "Logged in-app Dispatcher (No active external SMTP credentials)",
  };

  dispatchedRefundIds.add(params.refundId);
  emailDispatchLog.unshift(record);
  console.log(`📧 Dispatched Refund Email [${record.id}] to ${record.recipient} for Refund ${params.refundId}`);

  return { success: true, messageId: emailId, mode: "LOCAL_DISPATCH_LOG" };
}

export function getDispatchedEmails(): SentEmailRecord[] {
  return emailDispatchLog;
}

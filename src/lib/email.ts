import nodemailer from "nodemailer";
import * as fs from "fs";
import * as path from "path";

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

const DATA_DIR = path.join(process.cwd(), "data");
const EMAIL_STORE_FILE = path.join(DATA_DIR, "email_store.json");

function loadDurableEmailStore(): { logs: SentEmailRecord[]; dispatchedIds: string[] } {
  try {
    if (fs.existsSync(EMAIL_STORE_FILE)) {
      const raw = fs.readFileSync(EMAIL_STORE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.logs)) {
        return {
          logs: parsed.logs,
          dispatchedIds: Array.isArray(parsed.dispatchedIds) ? parsed.dispatchedIds : [],
        };
      }
    }
  } catch (err) {
    console.warn("Could not read durable email store:", err);
  }
  return { logs: [], dispatchedIds: [] };
}

const initialEmailData = loadDurableEmailStore();

// In-memory log of dispatched emails for UI inspection (persisted to disk)
export const emailDispatchLog: SentEmailRecord[] = initialEmailData.logs;

// Idempotency tracking to prevent duplicate confirmation emails (persisted to disk)
const dispatchedRefundIds = new Set<string>(initialEmailData.dispatchedIds);

function saveDurableEmailStore(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tempFile = `${EMAIL_STORE_FILE}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;
  try {
    fs.writeFileSync(
      tempFile,
      JSON.stringify(
        {
          logs: emailDispatchLog,
          dispatchedIds: Array.from(dispatchedRefundIds),
        },
        null,
        2
      ),
      "utf-8"
    );
    fs.renameSync(tempFile, EMAIL_STORE_FILE);
  } catch (err) {
    try {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    } catch {}
    console.error("Failed to atomically write durable email store:", err);
  }
}

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
  forceRetry?: boolean;
}): Promise<{ success: boolean; messageId?: string; mode: string; status: "SMTP_ACCEPTED" | "TEST_DISPATCHED" | "FAILED" }> {
  // If forceRetry is requested, clear any previous idempotency locks for this refund
  if (params.forceRetry && params.refundId) {
    dispatchedRefundIds.delete(params.refundId);
  }

  // Idempotency Guard: prevent duplicate email dispatches for the same refund request
  if (params.refundId && dispatchedRefundIds.has(params.refundId)) {
    console.log(`ℹ️ Refund email for ${params.refundId} already dispatched. Skipping duplicate send.`);
    return {
      success: true,
      messageId: `IDEMPOTENT_SKIPPED_${params.refundId}`,
      mode: "IDEMPOTENT_SKIPPED",
      status: "SMTP_ACCEPTED",
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
      saveDurableEmailStore();
      return { success: true, messageId: info.messageId, mode: "LIVE_SMTP", status: "SMTP_ACCEPTED" };
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
      saveDurableEmailStore();
      return { success: false, mode: "SMTP_FAILED", status: "FAILED" };
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
  saveDurableEmailStore();
  console.log(`📧 Dispatched Refund Email [${record.id}] to ${record.recipient} for Refund ${params.refundId}`);

  return { success: true, messageId: emailId, mode: "LOCAL_DISPATCH_LOG", status: "TEST_DISPATCHED" };
}

/**
 * Sends a one-time verification code (OTP) for customer identity authentication
 */
export async function sendCustomerOtpEmail(params: {
  customerEmail: string;
  customerName?: string;
  orderId: string;
  otpCode: string;
}): Promise<{ success: boolean; mode: string }> {
  const emailId = `OTP-${Date.now()}`;
  const subject = `[ApexStore Security] Your Verification Code: ${params.otpCode} (Order #${params.orderId})`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Your ApexStore Verification Code</title></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
      <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #4338ca, #6366f1); padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 20px;">ApexStore Account Security</h1>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">One-Time Customer Verification Code</p>
        </div>
        <div style="padding: 24px; color: #1e293b;">
          <p style="font-size: 14px; margin-top: 0;">Hello ${escapeHtml(params.customerName || "Customer")},</p>
          <p style="font-size: 13px; line-height: 1.5; color: #475569;">
            A request was initiated to verify ownership of <strong>Order #${escapeHtml(params.orderId)}</strong>.
            Please provide this 6-digit code to complete authentication:
          </p>
          <div style="background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; margin: 20px 0;">
            <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #4338ca; font-family: monospace;">${params.otpCode}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Valid for 10 minutes &bull; Do not share this code</div>
          </div>
          <p style="font-size: 12px; color: #94a3b8; line-height: 1.4;">
            If you did not request this verification, you can safely disregard this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const from = process.env.SMTP_FROM || '"ApexStore Security" <security@apexstore.demo>';

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

      await transporter.sendMail({
        from,
        to: params.customerEmail,
        subject,
        html,
      });

      emailDispatchLog.unshift({
        id: emailId,
        recipient: params.customerEmail,
        subject,
        refundId: `OTP-${params.orderId}`,
        orderId: params.orderId,
        amount: 0,
        htmlContent: html,
        sentAt: new Date().toISOString(),
        status: "SMTP_ACCEPTED",
        transportInfo: `Live SMTP (${host}) - OTP code sent`,
      });
      saveDurableEmailStore();
      return { success: true, mode: "LIVE_SMTP" };
    } catch (err: any) {
      console.error("Live SMTP OTP send failed:", err.message);
    }
  }

  emailDispatchLog.unshift({
    id: emailId,
    recipient: params.customerEmail,
    subject,
    refundId: `OTP-${params.orderId}`,
    orderId: params.orderId,
    amount: 0,
    htmlContent: html,
    sentAt: new Date().toISOString(),
    status: "TEST_DISPATCHED",
    transportInfo: `Demo OTP Dispatcher - Generated code: ${params.otpCode}`,
  });
  saveDurableEmailStore();
  console.log(`🔑 Customer OTP for Order ${params.orderId} (${params.customerEmail}): [${params.otpCode}]`);
  return { success: true, mode: "LOCAL_DISPATCH_LOG" };
}

export function getDispatchedEmails(): SentEmailRecord[] {
  return emailDispatchLog;
}

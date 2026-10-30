import { NextRequest, NextResponse } from "next/server";
import {
  checkGoogleSheetsConnection,
  seedGoogleSheets,
  getRefundRequests,
  getInteractionsLog,
  getProducts,
} from "@/lib/googleSheets";
import { getCompanyPolicies } from "@/lib/policies";
import { runtimeSettings } from "@/lib/gemini";
import { getDispatchedEmails } from "@/lib/email";

export async function GET() {
  try {
    const [sheetsStatus, policies, refunds, interactions, emails, products] = await Promise.all([
      checkGoogleSheetsConnection(),
      getCompanyPolicies(),
      getRefundRequests(),
      getInteractionsLog(),
      Promise.resolve(getDispatchedEmails()),
      getProducts(),
    ]);

    return NextResponse.json({
      googleSheets: sheetsStatus,
      policies: {
        lastUpdated: policies.lastUpdated,
        charCount: policies.text.length,
        htmlPreview: policies.html,
      },
      settings: runtimeSettings,
      refunds,
      interactions,
      emails,
      productsCount: products.length,
    });
  } catch (err: any) {
    console.error("Error in /api/admin GET:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, autoApprove } = body;

    if (action === "toggle_auto_approve") {
      runtimeSettings.autoApproveRefunds = Boolean(autoApprove);
      return NextResponse.json({
        success: true,
        autoApproveRefunds: runtimeSettings.autoApproveRefunds,
      });
    }

    if (action === "seed_sheets") {
      const result = await seedGoogleSheets();
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    console.error("Error in /api/admin POST:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

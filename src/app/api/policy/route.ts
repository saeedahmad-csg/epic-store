import { NextRequest, NextResponse } from "next/server";
import { getCompanyPolicies, searchPolicyRAG, updatePolicyDocument } from "@/lib/policies";
import { requireAdminKey } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || searchParams.get("query");

    if (query && query.trim()) {
      const retrieved = await searchPolicyRAG(query.trim());
      return NextResponse.json({
        query: query.trim(),
        totalMatches: retrieved.length,
        retrievedClauses: retrieved,
      });
    }

    const policies = await getCompanyPolicies();
    return NextResponse.json(policies);
  } catch (err: any) {
    console.error("Error in /api/policy GET:", err);
    return NextResponse.json(
      { error: "An internal server error occurred while retrieving policy clauses." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authError = requireAdminKey(req);
    if (authError) return authError;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided in form data." }, { status: 400 });
    }

    if (!file.name.endsWith(".docx")) {
      return NextResponse.json(
        { error: "Invalid file type. Only Microsoft Word (.docx) files are supported." },
        { status: 400 }
      );
    }

    // 5 MB file size limit to prevent memory exhaustion
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File exceeds 5 MB size limit." },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const updateRes = await updatePolicyDocument(buffer);
    if (!updateRes.success) {
      return NextResponse.json({ error: updateRes.error || "Failed to update policy." }, { status: 400 });
    }

    const newPolicies = await getCompanyPolicies();
    return NextResponse.json({
      success: true,
      message: "Successfully updated and re-indexed policy document (.docx)!",
      lastUpdated: newPolicies.lastUpdated,
    });
  } catch (err: any) {
    console.error("Error in /api/policy POST:", err);
    return NextResponse.json(
      { error: "An internal server error occurred while updating the policy document." },
      { status: 500 }
    );
  }
}

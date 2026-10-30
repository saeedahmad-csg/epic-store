import { NextRequest, NextResponse } from "next/server";
import { getCompanyPolicies, searchPolicyRAG, updatePolicyDocument } from "@/lib/policies";

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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

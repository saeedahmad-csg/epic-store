import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/googleSheets";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || undefined;
    const category = searchParams.get("category") || undefined;

    const products = await searchProducts(query, category);
    return NextResponse.json({ products });
  } catch (err: any) {
    console.error("Error in /api/products GET:", err);
    return NextResponse.json(
      { error: "An internal server error occurred while retrieving products." },
      { status: 500 }
    );
  }
}

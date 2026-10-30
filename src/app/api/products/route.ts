import { NextRequest, NextResponse } from "next/server";
import { getProducts, searchProducts } from "@/lib/googleSheets";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || undefined;
    const category = searchParams.get("category") || undefined;

    const products = await searchProducts(query, category);
    return NextResponse.json({ products });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

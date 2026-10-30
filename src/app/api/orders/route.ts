import { NextRequest, NextResponse } from "next/server";
import { getOrderById, getOrdersByCustomer } from "@/lib/googleSheets";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    const email = searchParams.get("email");

    if (orderId) {
      const order = await getOrderById(orderId);
      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      return NextResponse.json({ order });
    }

    if (email) {
      const orders = await getOrdersByCustomer(email);
      return NextResponse.json({ orders });
    }

    return NextResponse.json(
      { error: "Provide either ?orderId=... or ?email=..." },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

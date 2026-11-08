import { NextRequest, NextResponse } from "next/server";
import { processChatWithAgent } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, customerEmail } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: 'messages' array is required." },
        { status: 400 }
      );
    }

    const result = await processChatWithAgent({
      messages,
      customerEmail,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Error in /api/chat:", err);
    return NextResponse.json(
      { error: "An internal server error occurred in chat agent. Please try again shortly." },
      { status: 500 }
    );
  }
}

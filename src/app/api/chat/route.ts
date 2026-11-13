import { NextRequest, NextResponse } from "next/server";
import { processChatWithAgent } from "@/lib/gemini";

// In-memory sliding-window rate limiter for AI chat requests
interface ChatRateLimit {
  timestamps: number[];
}
const ipRateLimits = new Map<string, ChatRateLimit>();
const CHAT_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_CHAT_REQUESTS_PER_WINDOW = 25; // 25 messages per minute per IP

const MAX_CONVERSATION_MESSAGES = 30;
const MAX_MESSAGE_CONTENT_LENGTH = 4000;
const MAX_TOTAL_CONVERSATION_CHARS = 25000;
const ALLOWED_ROLES = new Set(["user", "assistant", "model"]);

function checkChatRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = ipRateLimits.get(ip) || { timestamps: [] };

  // Filter timestamps within the rolling window
  record.timestamps = record.timestamps.filter((t) => now - t < CHAT_RATE_LIMIT_WINDOW_MS);

  if (record.timestamps.length >= MAX_CHAT_REQUESTS_PER_WINDOW) {
    const oldest = record.timestamps[0];
    const retryAfter = Math.ceil((oldest + CHAT_RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter) };
  }

  record.timestamps.push(now);
  ipRateLimits.set(ip, record);
  return { allowed: true };
}

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting Protection
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : realIp || "127.0.0.1";

    const rateLimit = checkChatRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many chat messages. Please wait a moment before sending another message." },
        {
          status: 429,
          headers: { "Retry-After": (rateLimit.retryAfter || 60).toString() },
        }
      );
    }

    const body = await req.json();
    const { messages, customerEmail } = body;

    // 2. Schema and Message Array Validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: 'messages' array is required." },
        { status: 400 }
      );
    }

    if (messages.length > MAX_CONVERSATION_MESSAGES) {
      return NextResponse.json(
        { error: `Conversation exceeds maximum limit of ${MAX_CONVERSATION_MESSAGES} messages.` },
        { status: 400 }
      );
    }

    let totalChars = 0;
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (!msg || typeof msg !== "object") {
        return NextResponse.json({ error: `Message at index ${i} is malformed.` }, { status: 400 });
      }
      if (!ALLOWED_ROLES.has(msg.role)) {
        return NextResponse.json(
          { error: `Invalid message role '${msg.role}' at index ${i}. Allowed: user, assistant, model.` },
          { status: 400 }
        );
      }
      if (typeof msg.content !== "string") {
        return NextResponse.json(
          { error: `Message content at index ${i} must be a string.` },
          { status: 400 }
        );
      }
      if (msg.content.length > MAX_MESSAGE_CONTENT_LENGTH) {
        return NextResponse.json(
          { error: `Message at index ${i} exceeds maximum limit of ${MAX_MESSAGE_CONTENT_LENGTH} characters.` },
          { status: 400 }
        );
      }
      totalChars += msg.content.length;
    }

    if (totalChars > MAX_TOTAL_CONVERSATION_CHARS) {
      return NextResponse.json(
        { error: `Total conversation text exceeds ${MAX_TOTAL_CONVERSATION_CHARS} character budget.` },
        { status: 400 }
      );
    }

    // 3. Process with AI Agent
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

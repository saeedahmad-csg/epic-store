import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body || {};

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const envPassword = process.env.ADMIN_PASSWORD?.trim();
    const envSecretKey = (process.env.ADMIN_SECRET_KEY || envPassword)?.trim();

    if (!envEmail || !envPassword) {
      return NextResponse.json(
        { error: "Server error: Admin credentials are not configured in server environment." },
        { status: 500 }
      );
    }

    const inputEmail = String(email).trim().toLowerCase();
    const inputPassword = String(password).trim();

    // Strict backend check against environment variables
    if (inputEmail !== envEmail || inputPassword !== envPassword) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Authenticated successfully.",
      token: envSecretKey,
    });
  } catch (err: any) {
    console.error("Error in /api/admin/login:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during authentication." },
      { status: 500 }
    );
  }
}


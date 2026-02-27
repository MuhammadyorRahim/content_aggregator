import { NextResponse } from "next/server";

import { signOut } from "@/lib/auth";

export async function POST() {
  try {
    await signOut({ redirect: false });

    return NextResponse.json({
      success: true,
      data: { message: "Logged out successfully" },
    });
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Logout failed" }, { status: 500 });
  }
}

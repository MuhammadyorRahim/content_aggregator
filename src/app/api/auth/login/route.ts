import { AuthError } from "next-auth";
import { NextResponse } from "next/server";

import { signIn } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = loginSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    await signIn("credentials", {
      ...parsed.data,
      redirect: false,
    });

    return NextResponse.json({
      success: true,
      data: { message: "Logged in successfully" },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, data: null, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: false, data: null, error: "Login failed" }, { status: 500 });
  }
}

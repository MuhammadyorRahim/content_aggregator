import crypto from "crypto";
import { NextResponse } from "next/server";

import { passwordResetEmailTemplate } from "@/email-templates/password-reset";
import { PASSWORD_RESET_TOKEN_TTL_MS } from "@/lib/constants";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { forgotPasswordSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = forgotPasswordSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const user = await db.user.findUnique({ where: { email } });

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

      await db.passwordResetToken.create({
        data: {
          email,
          token,
          expires,
        },
      });

      const authUrl = process.env.AUTH_URL ?? "http://localhost:3000";
      const resetUrl = `${authUrl}/reset-password?token=${token}`;

      await sendEmail({
        to: email,
        subject: "Reset your password",
        html: passwordResetEmailTemplate({ name: user.name, resetUrl }),
      });
    }

    return NextResponse.json({
      success: true,
      data: { message: "If an account exists, a reset email has been sent." },
    });
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Failed to process request" },
      { status: 500 }
    );
  }
}

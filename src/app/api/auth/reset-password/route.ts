import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = resetPasswordSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { token, newPassword } = parsed.data;

    const resetToken = await db.passwordResetToken.findUnique({ where: { token } });
    if (!resetToken || resetToken.expires < new Date()) {
      return NextResponse.json({ success: false, data: null, error: "Invalid or expired token" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email: resetToken.email } });
    if (!user) {
      return NextResponse.json({ success: false, data: null, error: "Invalid token" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await db.session.deleteMany({ where: { userId: user.id } });
    await db.passwordResetToken.delete({ where: { token } });

    return NextResponse.json({ success: true, data: { message: "Password reset successful" } });
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Reset failed" }, { status: 500 });
  }
}

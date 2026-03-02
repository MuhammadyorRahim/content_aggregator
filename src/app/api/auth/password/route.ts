import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";
import { changePasswordSchema } from "@/lib/validations";

export async function PATCH(request: Request) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const json = await request.json();
    const parsed = changePasswordSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    const isCurrentPasswordValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { success: false, data: null, error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    const nextPasswordHash = await bcrypt.hash(parsed.data.newPassword, 12);

    await db.user.update({
      where: { id: userId },
      data: {
        passwordHash: nextPasswordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await db.session.deleteMany({ where: { userId } });

    return NextResponse.json({ success: true, data: { message: "Password changed successfully" } });
  } catch (error) {
    return handleApiError(error, "Failed to change password");
  }
}

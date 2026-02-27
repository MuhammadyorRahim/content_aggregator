import crypto from "crypto";
import { NextResponse } from "next/server";

import { verificationEmailTemplate } from "@/email-templates/verification";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { requireAuth } from "@/lib/auth-middleware";
import { updateProfileSchema } from "@/lib/validations";

function unauthorizedResponse() {
  return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        accounts: {
          where: { provider: "google" },
          select: { id: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: user
        ? {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
            name: user.name,
            timezone: user.timezone,
            theme: user.theme,
            role: user.role,
            plan: user.plan,
            createdAt: user.createdAt,
            googleConnected: user.accounts.length > 0,
          }
        : null,
    });
  } catch {
    return unauthorizedResponse();
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const json = await request.json();
    const parsed = updateProfileSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      return unauthorizedResponse();
    }

    const updates = parsed.data;
    const nextEmail = updates.email?.toLowerCase().trim();

    if (nextEmail && nextEmail !== existingUser.email) {
      const emailTaken = await db.user.findUnique({ where: { email: nextEmail } });
      if (emailTaken) {
        return NextResponse.json({ success: false, data: null, error: "Email already in use" }, { status: 409 });
      }
    }

    const user = await db.user.update({
      where: { id: userId },
      data: {
        name: updates.name,
        timezone: updates.timezone,
        theme: updates.theme,
        email: nextEmail,
        emailVerified: nextEmail && nextEmail !== existingUser.email ? null : existingUser.emailVerified,
      },
    });

    if (nextEmail && nextEmail !== existingUser.email) {
      const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await db.verificationToken.create({
        data: {
          identifier: nextEmail,
          token,
          expires,
        },
      });

      const authUrl = process.env.AUTH_URL ?? "http://localhost:3000";
      const verifyUrl = `${authUrl}/api/auth/verify-email?token=${token}`;

      await sendEmail({
        to: nextEmail,
        subject: "Verify your new email",
        html: verificationEmailTemplate({ name: user.name, verifyUrl }),
      });
    }

    return NextResponse.json({ success: true, data: { message: "Profile updated" } });
  } catch {
    return unauthorizedResponse();
  }
}

export async function DELETE() {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    await db.user.delete({ where: { id: userId } });

    return NextResponse.json({ success: true, data: { message: "Account deleted" } });
  } catch {
    return unauthorizedResponse();
  }
}

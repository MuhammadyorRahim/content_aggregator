import bcrypt from "bcrypt";
import crypto from "crypto";
import { NextResponse } from "next/server";

import { verificationEmailTemplate } from "@/email-templates/verification";
import { REGISTRATION_MODE } from "@/lib/constants";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { registerSchema } from "@/lib/validations";

const VERIFY_EMAIL_TTL_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = registerSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    if (REGISTRATION_MODE === "closed") {
      return NextResponse.json(
        { success: false, data: null, error: "Registration is closed" },
        { status: 403 }
      );
    }

    const { email, password, name, inviteCode } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedInviteCode = inviteCode?.trim().toUpperCase();

    const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return NextResponse.json(
        { success: false, data: null, error: "Email already in use" },
        { status: 409 }
      );
    }

    let inviteRecordId: string | null = null;

    if (REGISTRATION_MODE === "invite-only") {
      if (!normalizedInviteCode) {
        return NextResponse.json(
          { success: false, data: null, error: "Invite code is required" },
          { status: 400 }
        );
      }

      const inviteRecord = await db.inviteCode.findUnique({
        where: { code: normalizedInviteCode },
      });

      if (
        !inviteRecord ||
        inviteRecord.usedBy ||
        (inviteRecord.expiresAt && inviteRecord.expiresAt < new Date())
      ) {
        return NextResponse.json(
          { success: false, data: null, error: "Invalid or expired invite code" },
          { status: 400 }
        );
      }

      inviteRecordId = inviteRecord.id;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name,
      },
    });

    if (inviteRecordId) {
      await db.inviteCode.update({
        where: { id: inviteRecordId },
        data: {
          usedBy: user.id,
          usedAt: new Date(),
        },
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + VERIFY_EMAIL_TTL_MS);

    await db.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token,
        expires,
      },
    });

    const authUrl = process.env.AUTH_URL ?? "http://localhost:3000";
    const verifyUrl = `${authUrl}/api/auth/verify-email?token=${token}`;

    await sendEmail({
      to: normalizedEmail,
      subject: "Verify your email",
      html: verificationEmailTemplate({ name: user.name, verifyUrl }),
    });

    return NextResponse.json({
      success: true,
      data: {
        message: "Account created. Please verify your email before logging in.",
      },
    });
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Registration failed" }, { status: 500 });
  }
}

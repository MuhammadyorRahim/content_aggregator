import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth-middleware";
import { db } from "@/lib/db";
import { createInviteCodeSchema } from "@/lib/validations";

function generateInviteCode() {
  return crypto.randomBytes(6).toString("base64url").toUpperCase();
}

export async function GET() {
  try {
    await requireAdmin();

    const now = new Date();
    const records = await db.inviteCode.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: records.map((record) => {
        const isUsed = Boolean(record.usedBy);
        const isExpired = Boolean(record.expiresAt && record.expiresAt < now);

        return {
          ...record,
          isUsed,
          isExpired,
          isActive: !isUsed && !isExpired,
        };
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: false, data: null, error: "Failed to load invite codes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const userId = session.user.id;

    const json = await request.json().catch(() => ({}));
    const parsed = createInviteCodeSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    let inviteCode = parsed.data.code ?? generateInviteCode();
    let record = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        record = await db.inviteCode.create({
          data: {
            code: inviteCode,
            createdBy: userId,
            expiresAt: parsed.data.expiresAt ?? null,
          },
        });
        break;
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
          throw error;
        }

        if (parsed.data.code) {
          return NextResponse.json({ success: false, data: null, error: "Invite code already exists" }, { status: 409 });
        }

        inviteCode = generateInviteCode();
      }
    }

    if (!record) {
      return NextResponse.json(
        { success: false, data: null, error: "Failed to generate unique invite code" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: false, data: null, error: "Failed to create invite code" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth-middleware";
import { db } from "@/lib/db";
import { adminUpdateUserSchema } from "@/lib/validations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const DISABLED_UNTIL = new Date("2099-01-01T00:00:00.000Z");

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireAdmin();
    const adminId = session.user.id;
    const { id } = await context.params;

    const json = await request.json();
    const parsed = adminUpdateUserSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, data: null, error: "User not found" }, { status: 404 });
    }

    if (id === adminId && !parsed.data.enabled) {
      return NextResponse.json({ success: false, data: null, error: "You cannot disable your own account" }, { status: 400 });
    }

    const updated = await db.$transaction(async (tx) => {
      const nextUser = await tx.user.update({
        where: {
          id,
        },
        data: {
          lockedUntil: parsed.data.enabled ? null : DISABLED_UNTIL,
          failedLoginAttempts: 0,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          plan: true,
          lockedUntil: true,
        },
      });

      if (!parsed.data.enabled) {
        await tx.session.deleteMany({
          where: {
            userId: id,
          },
        });
      }

      return nextUser;
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        enabled: !updated.lockedUntil || updated.lockedUntil < new Date(),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: false, data: null, error: "Failed to update user" }, { status: 500 });
  }
}

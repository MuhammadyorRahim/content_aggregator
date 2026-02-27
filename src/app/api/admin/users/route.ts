import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth-middleware";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();
    const now = new Date();

    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        createdAt: true,
        lockedUntil: true,
        _count: {
          select: {
            userSources: true,
            userPostStates: true,
            scheduledEvents: true,
          },
        },
        sessions: {
          select: {
            expires: true,
          },
          orderBy: {
            expires: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const data = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      createdAt: user.createdAt,
      enabled: !user.lockedUntil || user.lockedUntil < now,
      lockedUntil: user.lockedUntil,
      sourceCount: user._count.userSources,
      postCount: user._count.userPostStates,
      scheduledCount: user._count.scheduledEvents,
      lastActiveAt: user.sessions[0]?.expires ?? null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: false, data: null, error: "Failed to load users" }, { status: 500 });
  }
}

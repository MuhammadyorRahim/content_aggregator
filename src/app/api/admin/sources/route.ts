import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth-middleware";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();

    const sources = await db.source.findMany({
      include: {
        _count: {
          select: {
            userSources: true,
            posts: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const data = sources.map((source) => ({
      ...source,
      subscriberCount: source._count.userSources,
      postCount: source._count.posts,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: false, data: null, error: "Failed to load sources" }, { status: 500 });
  }
}

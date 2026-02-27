import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth-middleware";
import { db } from "@/lib/db";
import { createGoogleCalendarEvent } from "@/lib/google-calendar";
import { requireProPlan } from "@/lib/plan-limits";
import { scheduleCreateSchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    await requireProPlan(userId);

    const events = await db.scheduledEvent.findMany({
      where: {
        userId,
      },
      include: {
        post: {
          include: {
            source: true,
          },
        },
      },
      orderBy: {
        scheduledAt: "asc",
      },
    });

    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "PLAN_REQUIRED") {
      return NextResponse.json({ success: false, data: null, error: "Pro plan required" }, { status: 403 });
    }

    return NextResponse.json({ success: false, data: null, error: "Failed to load schedule" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    await requireProPlan(userId);

    const json = await request.json();
    const parsed = scheduleCreateSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const post = await db.post.findFirst({
      where: {
        id: parsed.data.postId,
        source: {
          userSources: {
            some: {
              userId,
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!post) {
      return NextResponse.json({ success: false, data: null, error: "Post not found" }, { status: 404 });
    }

    let event = await db.scheduledEvent.create({
      data: {
        userId,
        postId: parsed.data.postId,
        title: parsed.data.title,
        scheduledAt: parsed.data.scheduledAt,
      },
      include: {
        post: {
          include: {
            source: true,
          },
        },
      },
    });

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });

    const description = [
      `Post: ${event.post.title ?? "Untitled post"}`,
      `Source: ${event.post.source.name}`,
      event.post.url ? `URL: ${event.post.url}` : null,
      "",
      "Created via Content Aggregator schedule.",
    ]
      .filter(Boolean)
      .join("\n");

    let googleEventId: string | null = null;
    try {
      googleEventId = await createGoogleCalendarEvent({
        userId,
        title: event.title,
        scheduledAt: event.scheduledAt,
        timezone: user?.timezone ?? "UTC",
        description,
      });
    } catch (syncError) {
      console.error("[schedule] Google Calendar create sync failed", syncError);
    }

    if (googleEventId) {
      event = await db.scheduledEvent.update({
        where: {
          id: event.id,
        },
        data: {
          googleEventId,
        },
        include: {
          post: {
            include: {
              source: true,
            },
          },
        },
      });
    }

    return NextResponse.json({ success: true, data: event }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "PLAN_REQUIRED") {
      return NextResponse.json({ success: false, data: null, error: "Pro plan required" }, { status: 403 });
    }

    return NextResponse.json({ success: false, data: null, error: "Failed to create schedule event" }, { status: 500 });
  }
}

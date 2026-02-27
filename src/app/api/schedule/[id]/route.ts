import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth-middleware";
import { db } from "@/lib/db";
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  updateGoogleCalendarEvent,
} from "@/lib/google-calendar";
import { requireProPlan } from "@/lib/plan-limits";
import { scheduleUpdateSchema } from "@/lib/validations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    await requireProPlan(userId);
    const { id } = await context.params;

    const json = await request.json();
    const parsed = scheduleUpdateSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const existing = await db.scheduledEvent.findFirst({
      where: {
        id,
        userId,
      },
      select: {
        id: true,
        title: true,
        googleEventId: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, data: null, error: "Event not found" }, { status: 404 });
    }

    let event = await db.scheduledEvent.update({
      where: {
        id,
      },
      data: {
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
      "Updated via Content Aggregator schedule.",
    ]
      .filter(Boolean)
      .join("\n");

    let syncedEventId: string | null = null;
    try {
      syncedEventId = existing.googleEventId
        ? await updateGoogleCalendarEvent({
            userId,
            googleEventId: existing.googleEventId,
            title: event.title,
            scheduledAt: event.scheduledAt,
            timezone: user?.timezone ?? "UTC",
            description,
          })
        : await createGoogleCalendarEvent({
            userId,
            title: event.title,
            scheduledAt: event.scheduledAt,
            timezone: user?.timezone ?? "UTC",
            description,
          });
    } catch (syncError) {
      console.error("[schedule] Google Calendar update sync failed", syncError);
    }

    if (syncedEventId && syncedEventId !== existing.googleEventId) {
      event = await db.scheduledEvent.update({
        where: {
          id: event.id,
        },
        data: {
          googleEventId: syncedEventId,
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

    return NextResponse.json({ success: true, data: event });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "PLAN_REQUIRED") {
      return NextResponse.json({ success: false, data: null, error: "Pro plan required" }, { status: 403 });
    }

    return NextResponse.json({ success: false, data: null, error: "Failed to update schedule event" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    await requireProPlan(userId);
    const { id } = await context.params;

    const existing = await db.scheduledEvent.findFirst({
      where: {
        id,
        userId,
      },
      select: {
        id: true,
        googleEventId: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, data: null, error: "Event not found" }, { status: 404 });
    }

    if (existing.googleEventId) {
      try {
        await deleteGoogleCalendarEvent(userId, existing.googleEventId);
      } catch (syncError) {
        console.error("[schedule] Google Calendar delete sync failed", syncError);
      }
    }

    await db.scheduledEvent.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ success: true, data: { message: "Event deleted" } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "PLAN_REQUIRED") {
      return NextResponse.json({ success: false, data: null, error: "Pro plan required" }, { status: 403 });
    }

    return NextResponse.json({ success: false, data: null, error: "Failed to delete schedule event" }, { status: 500 });
  }
}

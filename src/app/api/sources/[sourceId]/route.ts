import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireAuth } from "@/lib/auth-middleware";
import { db } from "@/lib/db";
import { updateSubscriptionSchema } from "@/lib/validations";

type RouteContext = {
  params: Promise<{ sourceId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const { sourceId } = await context.params;

    const json = await request.json();
    const parsed = updateSubscriptionSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const existing = await db.userSource.findUnique({
      where: {
        userId_sourceId: {
          userId,
          sourceId,
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, data: null, error: "Subscription not found" }, { status: 404 });
    }

    const updated = await db.userSource.update({
      where: {
        userId_sourceId: {
          userId,
          sourceId,
        },
      },
      data: {
        customName: parsed.data.customName,
        mutedUntil: parsed.data.mutedUntil,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error, "Failed to update subscription");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const { sourceId } = await context.params;

    const existing = await db.userSource.findUnique({
      where: {
        userId_sourceId: {
          userId,
          sourceId,
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, data: null, error: "Subscription not found" }, { status: 404 });
    }

    await db.userSource.delete({
      where: {
        userId_sourceId: {
          userId,
          sourceId,
        },
      },
    });

    return NextResponse.json({ success: true, data: { message: "Unsubscribed successfully" } });
  } catch (error) {
    return handleApiError(error, "Failed to unsubscribe");
  }
}

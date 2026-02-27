import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { BLOCKED_POST_INTERNAL_PREFIX } from "@/lib/constants";
import { requireAuth } from "@/lib/auth-middleware";
import { db } from "@/lib/db";
import { markAllReadSchema } from "@/lib/validations";

type IdRow = {
  id: string;
};

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    const parsed = markAllReadSchema.safeParse({
      sourceId: searchParams.get("sourceId") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid sourceId" },
        { status: 400 }
      );
    }

    const now = new Date();

    const sourceFilter = parsed.data.sourceId ? Prisma.sql`AND p.sourceId = ${parsed.data.sourceId}` : Prisma.empty;

    const rows = await db.$queryRaw<IdRow[]>`
      SELECT p.id
      FROM Post p
      JOIN UserSource us
        ON us.sourceId = p.sourceId
        AND us.userId = ${userId}
      LEFT JOIN BlockedPost bp
        ON bp.userId = ${userId}
        AND bp.sourceId = p.sourceId
        AND bp.externalId = COALESCE(p.externalId, ${BLOCKED_POST_INTERNAL_PREFIX} || p.id)
      WHERE (us.mutedUntil IS NULL OR us.mutedUntil < ${now})
        AND bp.id IS NULL
        ${sourceFilter}
    `;

    const postIds = rows.map((row) => row.id);

    if (!postIds.length) {
      return NextResponse.json({ success: true, data: { updatedCount: 0 } });
    }

    const result = await db.$transaction(async (tx) => {
      const existing = await tx.userPostState.findMany({
        where: {
          userId,
          postId: {
            in: postIds,
          },
        },
        select: {
          postId: true,
        },
      });

      const existingIds = new Set(existing.map((item) => item.postId));
      const toCreate = postIds.filter((postId) => !existingIds.has(postId));

      if (toCreate.length) {
        await tx.userPostState.createMany({
          data: toCreate.map((postId) => ({
            userId,
            postId,
            isRead: true,
            readAt: now,
          })),
        });
      }

      return tx.userPostState.updateMany({
        where: {
          userId,
          postId: {
            in: postIds,
          },
        },
        data: {
          isRead: true,
          readAt: now,
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        updatedCount: result.count,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ success: false, data: null, error: "Failed to mark posts as read" }, { status: 500 });
  }
}

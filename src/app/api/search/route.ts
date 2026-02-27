import { NextResponse } from "next/server";

import { BLOCKED_POST_INTERNAL_PREFIX } from "@/lib/constants";
import { requireAuth } from "@/lib/auth-middleware";
import { db } from "@/lib/db";
import { getSearchLookbackFloor } from "@/lib/plan-limits";
import { searchQuerySchema } from "@/lib/validations";

type SearchRow = {
  id: string;
  isRead: number;
  isSaved: number;
  sourceCustomName: string | null;
};

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    const parsed = searchQuerySchema.safeParse({
      q: searchParams.get("q") ?? "",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid query" },
        { status: 400 }
      );
    }

    const rawLimit = Number(searchParams.get("limit") ?? 25);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 25;
    const query = `%${parsed.data.q.trim().toLowerCase()}%`;
    const now = new Date();
    const searchLookbackFloor = await getSearchLookbackFloor(userId);
    const applyLookback = searchLookbackFloor ? 1 : 0;
    const lookbackDate = searchLookbackFloor ?? new Date(0);

    const rows = await db.$queryRaw<SearchRow[]>`
      SELECT
        p.id as id,
        COALESCE(ups.isRead, 0) as isRead,
        COALESCE(ups.isSaved, 0) as isSaved,
        us.customName as sourceCustomName
      FROM Post p
      JOIN UserSource us
        ON us.sourceId = p.sourceId
        AND us.userId = ${userId}
      LEFT JOIN UserPostState ups
        ON ups.postId = p.id
        AND ups.userId = ${userId}
      LEFT JOIN BlockedPost bp
        ON bp.userId = ${userId}
        AND bp.sourceId = p.sourceId
        AND bp.externalId = COALESCE(p.externalId, ${BLOCKED_POST_INTERNAL_PREFIX} || p.id)
      WHERE (us.mutedUntil IS NULL OR us.mutedUntil < ${now})
        AND bp.id IS NULL
        AND (${applyLookback} = 0 OR p.publishedAt >= ${lookbackDate})
        AND (
          LOWER(COALESCE(p.title, '')) LIKE ${query}
          OR LOWER(p.content) LIKE ${query}
          OR LOWER(COALESCE(p.author, '')) LIKE ${query}
        )
      ORDER BY p.publishedAt DESC, p.id DESC
      LIMIT ${limit}
    `;

    const postIds = rows.map((row) => row.id);
    if (!postIds.length) {
      return NextResponse.json({ success: true, data: [] });
    }

    const posts = await db.post.findMany({
      where: {
        id: {
          in: postIds,
        },
      },
      include: {
        source: true,
      },
    });

    const postMap = new Map(posts.map((post) => [post.id, post]));
    const rowMap = new Map(rows.map((row) => [row.id, row]));

    const data = postIds
      .map((postId) => {
        const post = postMap.get(postId);
        const row = rowMap.get(postId);

        if (!post || !row) {
          return null;
        }

        return {
          ...post,
          sourceCustomName: row.sourceCustomName,
          isRead: Boolean(row.isRead),
          isSaved: Boolean(row.isSaved),
        };
      })
      .filter((post): post is NonNullable<typeof post> => post !== null);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ success: false, data: null, error: "Failed to search posts" }, { status: 500 });
  }
}

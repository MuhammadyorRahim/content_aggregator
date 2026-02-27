import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { BLOCKED_POST_INTERNAL_PREFIX, FEED_PAGE_SIZE } from "@/lib/constants";
import { requireAuth } from "@/lib/auth-middleware";
import { db } from "@/lib/db";

function parseBoolean(value: string | null) {
  if (value === null) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

type PostStateRow = {
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
    const cursor = searchParams.get("cursor");
    const rawLimit = Number(searchParams.get("limit") ?? FEED_PAGE_SIZE);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : FEED_PAGE_SIZE;
    const category = searchParams.get("category");
    const sourceId = searchParams.get("sourceId");
    const sourceType = searchParams.get("sourceType");
    const isRead = parseBoolean(searchParams.get("isRead"));
    const isSaved = parseBoolean(searchParams.get("isSaved"));

    const now = new Date();
    const cursorPost = cursor
      ? await db.post.findUnique({
          where: { id: cursor },
          select: { id: true, publishedAt: true },
        })
      : null;

    const conditions: Prisma.Sql[] = [
      Prisma.sql`(us.mutedUntil IS NULL OR us.mutedUntil < ${now})`,
      Prisma.sql`bp.id IS NULL`,
    ];

    if (category) {
      conditions.push(Prisma.sql`p.category = ${category}`);
    }

    if (sourceId) {
      conditions.push(Prisma.sql`p.sourceId = ${sourceId}`);
    }

    if (sourceType) {
      conditions.push(Prisma.sql`s.type = ${sourceType}`);
    }

    if (isRead !== undefined) {
      conditions.push(Prisma.sql`COALESCE(ups.isRead, 0) = ${isRead ? 1 : 0}`);
    }

    if (isSaved !== undefined) {
      conditions.push(Prisma.sql`COALESCE(ups.isSaved, 0) = ${isSaved ? 1 : 0}`);
    }

    if (cursorPost) {
      conditions.push(
        Prisma.sql`(p.publishedAt < ${cursorPost.publishedAt} OR (p.publishedAt = ${cursorPost.publishedAt} AND p.id < ${cursorPost.id}))`
      );
    }

    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

    const rows = await db.$queryRaw<PostStateRow[]>`
      SELECT
        p.id as id,
        COALESCE(ups.isRead, 0) as isRead,
        COALESCE(ups.isSaved, 0) as isSaved,
        us.customName as sourceCustomName
      FROM Post p
      JOIN Source s
        ON s.id = p.sourceId
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
      ${whereClause}
      ORDER BY p.publishedAt DESC, p.id DESC
      LIMIT ${limit + 1}
    `;

    const hasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);
    const postIds = pageRows.map((row) => row.id);

    if (!postIds.length) {
      return NextResponse.json({
        success: true,
        data: [],
        meta: { page: 1, totalPages: 1, totalCount: 0, hasMore: false },
      });
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
    const stateMap = new Map(pageRows.map((row) => [row.id, row]));

    const data = postIds
      .map((postId) => {
        const post = postMap.get(postId);
        const state = stateMap.get(postId);

        if (!post || !state) {
          return null;
        }

        return {
          ...post,
          sourceCustomName: state.sourceCustomName,
          isRead: Boolean(state.isRead),
          isSaved: Boolean(state.isSaved),
        };
      })
      .filter((post): post is NonNullable<typeof post> => post !== null);

    return NextResponse.json({
      success: true,
      data,
      meta: {
        page: 1,
        totalPages: 1,
        totalCount: data.length,
        hasMore,
      },
    });
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
  }
}

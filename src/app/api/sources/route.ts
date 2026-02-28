import { NextResponse } from "next/server";

import { processFetchedPosts } from "@/lib/content-processor";
import { BLOCKED_POST_INTERNAL_PREFIX, CONTENT_START_DATE } from "@/lib/constants";
import { db } from "@/lib/db";
import { fetchers } from "@/lib/fetchers";
import { requireAuth } from "@/lib/auth-middleware";
import { requireSourceCapacity } from "@/lib/plan-limits";
import { normalizeSourceUrl } from "@/lib/url-normalizer";
import { addSourceSchema } from "@/lib/validations";

async function dedupAndInsertPosts(sourceId: string, posts: ReturnType<typeof processFetchedPosts>) {
  if (!posts.length) return 0;

  const externalIds = posts.map((post) => post.externalId);
  const existing = await db.post.findMany({
    where: {
      sourceId,
      externalId: { in: externalIds },
    },
    select: { externalId: true },
  });

  const existingSet = new Set(existing.map((item) => item.externalId).filter(Boolean));
  const toInsert = posts.filter((item) => !existingSet.has(item.externalId));

  if (!toInsert.length) return 0;

  const result = await db.post.createMany({
    data: toInsert.map((item) => ({
      sourceId,
      externalId: item.externalId,
      title: item.title ?? null,
      content: item.content,
      author: item.author ?? null,
      url: item.url ?? null,
      imageUrl: item.imageUrl ?? null,
      mediaType: item.mediaType,
      category: item.category,
      metadata: item.metadata ? JSON.stringify(item.metadata) : null,
      publishedAt: item.publishedAt,
    })),
  });

  return result.count;
}

export async function GET() {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const subscriptions = await db.userSource.findMany({
      where: { userId },
      include: { source: true },
      orderBy: { createdAt: "desc" },
    });

    const unreadCounts = await Promise.all(
      subscriptions.map(async (item) => {
        const rows = await db.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(1) as count
          FROM Post p
          LEFT JOIN UserPostState ups
            ON ups.postId = p.id AND ups.userId = ${userId}
          LEFT JOIN BlockedPost bp
            ON bp.sourceId = p.sourceId
            AND bp.externalId = COALESCE(p.externalId, ${BLOCKED_POST_INTERNAL_PREFIX} || p.id)
            AND bp.userId = ${userId}
          WHERE p.sourceId = ${item.sourceId}
            AND bp.id IS NULL
            AND COALESCE(ups.isRead, 0) = 0
        `;

        return [item.sourceId, rows[0]?.count ?? 0] as const;
      })
    );

    const unreadMap = new Map(unreadCounts);

    return NextResponse.json({
      success: true,
      data: subscriptions.map((item) => ({
        ...item,
        unreadCount: unreadMap.get(item.sourceId) ?? 0,
      })),
    });
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const json = await request.json();
    const parsed = addSourceSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { type, url, name } = parsed.data;
    const normalizedUrl = normalizeSourceUrl(type, url);

    let source = await db.source.findUnique({ where: { normalizedUrl } });
    let createdSource = false;
    if (source) {
      const existingSubscription = await db.userSource.findUnique({
        where: {
          userId_sourceId: {
            userId,
            sourceId: source.id,
          },
        },
      });

      if (existingSubscription) {
        return NextResponse.json(
          { success: false, data: null, error: "Already subscribed to this source" },
          { status: 409 }
        );
      }

      await requireSourceCapacity(userId);
    } else {
      await requireSourceCapacity(userId);
      source = await db.source.create({
        data: {
          type,
          url,
          normalizedUrl,
          name: name ?? normalizedUrl,
          lastFetchStatus: "never",
        },
      });
      createdSource = true;
    }

    await db.userSource.create({
      data: {
        userId,
        sourceId: source.id,
        customName: name ?? null,
      },
    });

    let fetchedCount = 0;
    let oldestFetchedAt: Date | null = null;

    if (createdSource) {
      const fetcher = fetchers[type];
      if (fetcher) {
        try {
          const fetched = await fetcher.fetch(source, CONTENT_START_DATE);
          const processed = processFetchedPosts(fetched);
          fetchedCount = await dedupAndInsertPosts(source.id, processed);

          oldestFetchedAt = processed.length
            ? new Date(
                Math.min(...processed.map((item) => item.publishedAt.getTime()))
              )
            : null;

          const now = new Date();
          await db.source.update({
            where: { id: source.id },
            data: {
              lastFetchedAt: now,
              lastFetchStatus: "success",
            },
          });

          await db.cacheEntry.upsert({
            where: { sourceId: source.id },
            create: {
              sourceId: source.id,
              fetchedAt: now,
              expiresAt: new Date(now.getTime() + 15 * 60_000),
            },
            update: {
              fetchedAt: now,
              expiresAt: new Date(now.getTime() + 15 * 60_000),
            },
          });
        } catch (fetchError) {
          console.error("[sources] Initial fetch failed for", source.normalizedUrl, fetchError);
          await db.source.update({
            where: { id: source.id },
            data: { lastFetchStatus: "failed" },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        sourceId: source.id,
        fetchedCount,
        oldestFetchedAt,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "SOURCE_LIMIT_REACHED") {
      return NextResponse.json(
        { success: false, data: null, error: "Free plan supports up to 5 sources. Upgrade to Pro for unlimited." },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: false, data: null, error: "Failed to subscribe source" }, { status: 500 });
  }
}

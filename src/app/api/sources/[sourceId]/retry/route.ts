import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { processFetchedPosts } from "@/lib/content-processor";
import { CONTENT_START_DATE } from "@/lib/constants";
import { db } from "@/lib/db";
import { fetchers } from "@/lib/fetchers";
import { FetchError } from "@/lib/fetchers/types";
import { requireAuth } from "@/lib/auth-middleware";

type RouteContext = {
  params: Promise<{ sourceId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const { sourceId } = await context.params;

    const subscription = await db.userSource.findUnique({
      where: {
        userId_sourceId: { userId, sourceId },
      },
      include: { source: true },
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, data: null, error: "Subscription not found" },
        { status: 404 }
      );
    }

    const source = subscription.source;
    const fetcher = fetchers[source.type];

    if (!fetcher) {
      return NextResponse.json(
        { success: false, data: null, error: `No fetcher available for type: ${source.type}` },
        { status: 400 }
      );
    }

    const since = source.lastFetchedAt ?? CONTENT_START_DATE;

    try {
      const result = await fetcher.fetch(source, since);
      const processed = processFetchedPosts(result.posts);

      let insertedCount = 0;
      if (processed.length) {
        const externalIds = processed.map((p) => p.externalId);
        const existing = await db.post.findMany({
          where: { sourceId, externalId: { in: externalIds } },
          select: { externalId: true },
        });
        const existingSet = new Set(existing.map((p) => p.externalId).filter(Boolean));
        const toInsert = processed.filter((p) => !existingSet.has(p.externalId));

        if (toInsert.length) {
          const inserted = await db.post.createMany({
            data: toInsert.map((post) => ({
              sourceId,
              externalId: post.externalId,
              title: post.title ?? null,
              content: post.content,
              author: post.author ?? null,
              url: post.url ?? null,
              imageUrl: post.imageUrl ?? null,
              mediaType: post.mediaType,
              category: post.category,
              metadata: post.metadata ? JSON.stringify(post.metadata) : null,
              publishedAt: post.publishedAt,
            })),
          });
          insertedCount = inserted.count;
        }
      }

      const now = new Date();
      await db.source.update({
        where: { id: sourceId },
        data: { lastFetchedAt: now, lastFetchStatus: "success" },
      });

      await db.cacheEntry.upsert({
        where: { sourceId },
        create: { sourceId, fetchedAt: now, expiresAt: new Date(now.getTime() + 15 * 60_000) },
        update: { fetchedAt: now, expiresAt: new Date(now.getTime() + 15 * 60_000) },
      });

      return NextResponse.json({
        success: true,
        data: {
          fetchedCount: result.posts.length,
          insertedCount,
          warning: result.warning,
        },
      });
    } catch (fetchError) {
      await db.source.update({
        where: { id: sourceId },
        data: { lastFetchStatus: "failed" },
      });

      const message =
        fetchError instanceof FetchError
          ? fetchError.message
          : "Failed to fetch posts from this source.";

      return NextResponse.json(
        { success: false, data: null, error: message },
        { status: 502 }
      );
    }
  } catch (error) {
    return handleApiError(error, "Failed to retry source fetch");
  }
}

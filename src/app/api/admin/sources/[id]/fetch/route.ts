import { NextResponse } from "next/server";

import { processFetchedPosts } from "@/lib/content-processor";
import {
  CACHE_DURATION_FREE_MINUTES,
  CACHE_DURATION_PRO_MINUTES,
  CONTENT_START_DATE,
} from "@/lib/constants";
import { requireAdmin } from "@/lib/auth-middleware";
import { db } from "@/lib/db";
import { fetchers } from "@/lib/fetchers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    const source = await db.source.findUnique({
      where: { id },
      include: {
        userSources: {
          select: {
            user: {
              select: {
                plan: true,
              },
            },
          },
        },
      },
    });

    if (!source) {
      return NextResponse.json({ success: false, data: null, error: "Source not found" }, { status: 404 });
    }

    const fetcher = fetchers[source.type];
    if (!fetcher) {
      return NextResponse.json({ success: false, data: null, error: "Fetcher not available for source type" }, { status: 400 });
    }

    const fetchedPosts = await fetcher.fetch(source, source.lastFetchedAt ?? CONTENT_START_DATE);
    const processedPosts = processFetchedPosts(fetchedPosts);

    const externalIds = processedPosts.map((post) => post.externalId);
    const existingPosts = await db.post.findMany({
      where: {
        sourceId: source.id,
        externalId: {
          in: externalIds,
        },
      },
      select: {
        externalId: true,
      },
    });

    const existingIds = new Set(existingPosts.map((post) => post.externalId).filter(Boolean));
    const toInsert = processedPosts.filter((post) => !existingIds.has(post.externalId));

    let insertedCount = 0;
    if (toInsert.length) {
      const inserted = await db.post.createMany({
        data: toInsert.map((post) => ({
          sourceId: source.id,
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

    const now = new Date();
    const cacheMinutes = source.userSources.some((subscription) => subscription.user.plan === "pro")
      ? CACHE_DURATION_PRO_MINUTES
      : CACHE_DURATION_FREE_MINUTES;

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
        expiresAt: new Date(now.getTime() + cacheMinutes * 60_000),
      },
      update: {
        fetchedAt: now,
        expiresAt: new Date(now.getTime() + cacheMinutes * 60_000),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        sourceId: source.id,
        fetchedCount: fetchedPosts.length,
        insertedCount,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: false, data: null, error: "Failed to fetch source" }, { status: 500 });
  }
}

import cron from "node-cron";

import { CACHE_DURATION_FREE_MINUTES, CACHE_DURATION_PRO_MINUTES, CONTENT_START_DATE } from "@/lib/constants";
import { db } from "@/lib/db";
import { fetchers } from "@/lib/fetchers";
import type { FetchedPost } from "@/lib/fetchers/types";
import { processFetchedPosts } from "@/lib/content-processor";

const WORKER_LOCK_ID = "fetch-worker";
const LOCK_TIMEOUT_MINUTES = 30;
const SOURCE_FETCH_TIMEOUT_MS = 10_000;

type SourceWithRelations = Awaited<ReturnType<typeof getEligibleSources>>[number];

async function acquireLock() {
  const now = new Date();
  const cutoff = new Date(Date.now() - LOCK_TIMEOUT_MINUTES * 60_000);

  const existing = await db.workerLock.findUnique({ where: { id: WORKER_LOCK_ID } });

  if (existing && existing.lockedAt > cutoff) {
    return false;
  }

  await db.workerLock.upsert({
    where: { id: WORKER_LOCK_ID },
    create: { id: WORKER_LOCK_ID, lockedAt: now },
    update: { lockedAt: now },
  });

  return true;
}

async function releaseLock() {
  await db.workerLock.deleteMany({ where: { id: WORKER_LOCK_ID } });
}

async function getEligibleSources() {
  const now = new Date();

  return db.source.findMany({
    where: {
      enabled: true,
      userSources: {
        some: {
          OR: [{ mutedUntil: null }, { mutedUntil: { lt: now } }],
        },
      },
    },
    include: {
      cacheEntry: true,
      userSources: {
        where: {
          OR: [{ mutedUntil: null }, { mutedUntil: { lt: now } }],
        },
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
}

function getCacheDurationMinutes(source: SourceWithRelations) {
  const hasProSubscriber = source.userSources.some((item) => item.user.plan === "pro");
  return hasProSubscriber ? CACHE_DURATION_PRO_MINUTES : CACHE_DURATION_FREE_MINUTES;
}

function shouldFetchSource(source: SourceWithRelations) {
  const cacheMinutes = getCacheDurationMinutes(source);
  const cacheAgeCutoff = new Date(Date.now() - cacheMinutes * 60_000);

  if (!source.cacheEntry) {
    return true;
  }

  return source.cacheEntry.fetchedAt < cacheAgeCutoff;
}

async function withTimeout<T>(promiseFactory: () => Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Fetch timeout"));
    }, timeoutMs);

    promiseFactory()
      .then((result) => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

async function fetchWithRetry(source: SourceWithRelations) {
  const fetcher = fetchers[source.type];

  if (!fetcher) {
    throw new Error(`No fetcher found for source type: ${source.type}`);
  }

  const since = source.lastFetchedAt ?? CONTENT_START_DATE;

  const execute = () => withTimeout(() => fetcher.fetch(source, since), SOURCE_FETCH_TIMEOUT_MS);

  try {
    return await execute();
  } catch {
    return await execute();
  }
}

async function persistFetchedPosts(source: SourceWithRelations, fetchedPosts: FetchedPost[]) {
  const processed = processFetchedPosts(fetchedPosts);

  if (!processed.length) {
    return 0;
  }

  const externalIds = processed.map((post) => post.externalId);
  const existing = await db.post.findMany({
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

  const existingSet = new Set(existing.map((post) => post.externalId).filter(Boolean));
  const toInsert = processed.filter((post) => !existingSet.has(post.externalId));

  if (!toInsert.length) {
    return 0;
  }

  const result = await db.post.createMany({
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

  return result.count;
}

async function markSourceSuccess(source: SourceWithRelations, cacheDurationMinutes: number) {
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
      expiresAt: new Date(now.getTime() + cacheDurationMinutes * 60_000),
    },
    update: {
      fetchedAt: now,
      expiresAt: new Date(now.getTime() + cacheDurationMinutes * 60_000),
    },
  });
}

async function markSourceFailure(source: SourceWithRelations) {
  await db.source.update({
    where: { id: source.id },
    data: {
      lastFetchStatus: "failed",
    },
  });
}

export type FetchCycleResult = {
  skipped: boolean;
  reason?: "lock_active" | "no_stale_sources";
  totalSources: number;
  staleSources: number;
  fetchedSources: number;
  failedSources: number;
  newPosts: number;
};

export async function runFetchCycle(): Promise<FetchCycleResult> {
  const lockAcquired = await acquireLock();

  if (!lockAcquired) {
    console.log("[worker] Skipping cycle: lock is active");
    return {
      skipped: true,
      reason: "lock_active",
      totalSources: 0,
      staleSources: 0,
      fetchedSources: 0,
      failedSources: 0,
      newPosts: 0,
    };
  }

  let successCount = 0;
  let failedCount = 0;
  let totalNewPosts = 0;
  let totalSources = 0;
  let staleSourcesCount = 0;

  try {
    const sources = await getEligibleSources();
    totalSources = sources.length;
    const staleSources = sources.filter(shouldFetchSource);
    staleSourcesCount = staleSources.length;

    if (!staleSources.length) {
      console.log("[worker] No stale sources to fetch");
      return {
        skipped: true,
        reason: "no_stale_sources",
        totalSources,
        staleSources: staleSourcesCount,
        fetchedSources: 0,
        failedSources: 0,
        newPosts: 0,
      };
    }

    const results = await Promise.allSettled(
      staleSources.map(async (source) => {
        const fetchedPosts = await fetchWithRetry(source);
        const insertedCount = await persistFetchedPosts(source, fetchedPosts);
        const cacheDuration = getCacheDurationMinutes(source);

        await markSourceSuccess(source, cacheDuration);

        return {
          sourceId: source.id,
          insertedCount,
        };
      })
    );

    await Promise.all(
      results.map(async (result, index) => {
        if (result.status === "fulfilled") {
          successCount += 1;
          totalNewPosts += result.value.insertedCount;
          return;
        }

        failedCount += 1;
        const source = staleSources[index];
        if (source) {
          await markSourceFailure(source);
        }
        console.error("[worker] Source fetch failed", source?.id, result.reason);
      })
    );

    console.log(
      `[worker] Fetched ${successCount}/${staleSources.length} sources, ${totalNewPosts} new posts, ${failedCount} failed`
    );

    return {
      skipped: false,
      totalSources,
      staleSources: staleSourcesCount,
      fetchedSources: successCount,
      failedSources: failedCount,
      newPosts: totalNewPosts,
    };
  } finally {
    await releaseLock();
  }
}

export function startWorker() {
  console.log("[worker] Starting cron schedule: */15 * * * *");

  cron.schedule("*/15 * * * *", async () => {
    try {
      await runFetchCycle();
    } catch (error) {
      console.error("[worker] Fetch cycle crashed", error);
    }
  });
}

if (process.env.RUN_BACKGROUND_WORKER === "true") {
  startWorker();
}

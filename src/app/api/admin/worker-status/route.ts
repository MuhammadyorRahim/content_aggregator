import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth-middleware";
import { db } from "@/lib/db";

const WORKER_LOCK_ID = "fetch-worker";
const STALE_THRESHOLD_MINUTES = 60;

export async function GET() {
  try {
    await requireAdmin();
    const staleCutoff = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60_000);

    const [lock, totalSources, staleSources, failedSources, latestFetchedSource] = await Promise.all([
      db.workerLock.findUnique({
        where: { id: WORKER_LOCK_ID },
      }),
      db.source.count({
        where: {
          enabled: true,
        },
      }),
      db.source.count({
        where: {
          enabled: true,
          OR: [{ lastFetchedAt: null }, { lastFetchedAt: { lt: staleCutoff } }],
        },
      }),
      db.source.count({
        where: {
          enabled: true,
          lastFetchStatus: "failed",
        },
      }),
      db.source.findFirst({
        where: {
          enabled: true,
          lastFetchedAt: {
            not: null,
          },
        },
        orderBy: {
          lastFetchedAt: "desc",
        },
        select: {
          id: true,
          name: true,
          lastFetchedAt: true,
          lastFetchStatus: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        worker: {
          lockActive: Boolean(lock),
          lockedAt: lock?.lockedAt ?? null,
        },
        sources: {
          total: totalSources,
          stale: staleSources,
          failed: failedSources,
          latestFetched: latestFetchedSource,
        },
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: false, data: null, error: "Failed to load worker status" }, { status: 500 });
  }
}

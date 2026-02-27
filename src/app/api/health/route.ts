import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth-middleware";
import { db } from "@/lib/db";

const WORKER_LOCK_ID = "fetch-worker";

export async function GET() {
  try {
    await requireAdmin();

    const [databaseCheck, sourcesCount, usersCount, workerLock] = await Promise.all([
      db.$queryRaw<Array<{ ok: number }>>`SELECT 1 as ok`,
      db.source.count(),
      db.user.count(),
      db.workerLock.findUnique({
        where: { id: WORKER_LOCK_ID },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        status: databaseCheck[0]?.ok === 1 ? "ok" : "degraded",
        database: "connected",
        users: usersCount,
        sources: sourcesCount,
        worker: {
          locked: Boolean(workerLock),
          lockedAt: workerLock?.lockedAt ?? null,
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

    return NextResponse.json({ success: false, data: null, error: "Health check failed" }, { status: 500 });
  }
}

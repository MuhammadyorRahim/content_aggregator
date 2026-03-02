import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { BLOCKED_POST_INTERNAL_PREFIX } from "@/lib/constants";
import { requireAuth } from "@/lib/auth-middleware";
import { db } from "@/lib/db";

type CategoryRow = {
  category: string;
  count: bigint | number;
};

export async function GET() {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const now = new Date();

    const rows = await db.$queryRaw<CategoryRow[]>`
      SELECT
        COALESCE(p.category, 'Uncategorized') as category,
        COUNT(1) as count
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
      GROUP BY COALESCE(p.category, 'Uncategorized')
      ORDER BY count DESC, category ASC
    `;

    const data = rows.map((row) => ({ category: row.category, count: Number(row.count) }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, "Failed to load categories");
  }
}

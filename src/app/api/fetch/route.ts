import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth-middleware";
import { recordManualRefresh, requireManualRefreshAllowance } from "@/lib/plan-limits";
import { runFetchCycle } from "@/worker";

export async function POST() {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    await requireManualRefreshAllowance(userId);
    const result = await runFetchCycle();
    await recordManualRefresh(userId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "MANUAL_REFRESH_LIMIT_REACHED") {
      return NextResponse.json(
        { success: false, data: null, error: "Manual refresh limit reached for this hour." },
        { status: 429 }
      );
    }

    return NextResponse.json({ success: false, data: null, error: "Failed to trigger fetch" }, { status: 500 });
  }
}

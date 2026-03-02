import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET() {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        userSources: true,
        userPostStates: true,
        scheduledEvents: true,
        blockedPosts: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, data: user });
    response.headers.set("Content-Disposition", 'attachment; filename="personal-data.json"');
    return response;
  } catch (error) {
    return handleApiError(error, "Failed to export data");
  }
}

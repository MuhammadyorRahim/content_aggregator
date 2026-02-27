import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth-middleware";
import { db } from "@/lib/db";
import { normalizeSourceUrl } from "@/lib/url-normalizer";
import { adminUpdateSourceSchema } from "@/lib/validations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    const json = await request.json();
    const parsed = adminUpdateSourceSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const existing = await db.source.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        type: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, data: null, error: "Source not found" }, { status: 404 });
    }

    const nextUrl = parsed.data.url;
    const updated = await db.source.update({
      where: {
        id,
      },
      data: {
        ...(nextUrl
          ? {
              url: nextUrl,
              normalizedUrl: normalizeSourceUrl(existing.type, nextUrl),
            }
          : {}),
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.enabled !== undefined ? { enabled: parsed.data.enabled } : {}),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ success: false, data: null, error: "Normalized URL already exists" }, { status: 409 });
    }

    return NextResponse.json({ success: false, data: null, error: "Failed to update source" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth-middleware";
import { toBlockedExternalId } from "@/lib/blocked-post";
import { db } from "@/lib/db";
import { updatePostStateSchema } from "@/lib/validations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const { id: postId } = await context.params;

    const json = await request.json();
    const parsed = updatePostStateSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const post = await db.post.findFirst({
      where: {
        id: postId,
        source: {
          userSources: {
            some: {
              userId,
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!post) {
      return NextResponse.json({ success: false, data: null, error: "Post not found" }, { status: 404 });
    }

    const now = new Date();
    const data: {
      isRead?: boolean;
      isSaved?: boolean;
      readAt?: Date | null;
      savedAt?: Date | null;
    } = {};

    if (parsed.data.isRead !== undefined) {
      data.isRead = parsed.data.isRead;
      data.readAt = parsed.data.isRead ? now : null;
    }

    if (parsed.data.isSaved !== undefined) {
      data.isSaved = parsed.data.isSaved;
      data.savedAt = parsed.data.isSaved ? now : null;
    }

    const userPostState = await db.userPostState.upsert({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
      create: {
        userId,
        postId,
        ...data,
      },
      update: data,
    });

    return NextResponse.json({ success: true, data: userPostState });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ success: false, data: null, error: "Failed to update post state" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const { id: postId } = await context.params;

    const post = await db.post.findFirst({
      where: {
        id: postId,
        source: {
          userSources: {
            some: {
              userId,
            },
          },
        },
      },
      select: {
        id: true,
        sourceId: true,
        externalId: true,
      },
    });

    if (!post) {
      return NextResponse.json({ success: false, data: null, error: "Post not found" }, { status: 404 });
    }

    await db.blockedPost.upsert({
      where: {
        userId_sourceId_externalId: {
          userId,
          sourceId: post.sourceId,
          externalId: toBlockedExternalId(post.id, post.externalId),
        },
      },
      create: {
        userId,
        sourceId: post.sourceId,
        externalId: toBlockedExternalId(post.id, post.externalId),
      },
      update: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: { message: "Post hidden from your feed" } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ success: false, data: null, error: "Failed to block post" }, { status: 500 });
  }
}

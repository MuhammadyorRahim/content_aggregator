import { beforeEach, describe, expect, it, vi } from "vitest";

import { PATCH as patchPostState } from "@/app/api/posts/[id]/route";
import { GET as listPosts } from "@/app/api/posts/route";
import { GET as searchPosts } from "@/app/api/search/route";
import { db } from "@/lib/db";
import { clearDatabase } from "../helpers/db";

const { requireAuthMock } = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
}));

vi.mock("@/lib/auth-middleware", () => ({
  requireAuth: requireAuthMock,
  requireAdmin: vi.fn(),
}));

async function createUser(input: { email: string; plan?: "free" | "pro" }) {
  return db.user.create({
    data: {
      email: input.email,
      passwordHash: "hash",
      name: input.email.split("@")[0],
      plan: input.plan ?? "free",
      emailVerified: new Date(),
    },
  });
}

async function createSource(input: { type: string; url: string; normalizedUrl: string; name: string }) {
  return db.source.create({
    data: {
      type: input.type,
      url: input.url,
      normalizedUrl: input.normalizedUrl,
      name: input.name,
      lastFetchStatus: "success",
    },
  });
}

describe("API data isolation", () => {
  beforeEach(async () => {
    requireAuthMock.mockReset();
    await clearDatabase();
  });

  it("returns only posts from sources subscribed by the current user", async () => {
    const userA = await createUser({ email: "usera@example.com" });
    const userB = await createUser({ email: "userb@example.com" });

    const sourceA = await createSource({
      type: "website",
      url: "https://a.example.com",
      normalizedUrl: "website:a.example.com",
      name: "Source A",
    });
    const sourceB = await createSource({
      type: "website",
      url: "https://b.example.com",
      normalizedUrl: "website:b.example.com",
      name: "Source B",
    });

    await db.userSource.createMany({
      data: [
        { userId: userA.id, sourceId: sourceA.id },
        { userId: userB.id, sourceId: sourceB.id },
      ],
    });

    await db.post.createMany({
      data: [
        {
          sourceId: sourceA.id,
          externalId: "a-1",
          title: "Visible to user A",
          content: "Only user A should see this in feed",
          mediaType: "article",
          publishedAt: new Date("2026-02-24T10:00:00.000Z"),
        },
        {
          sourceId: sourceB.id,
          externalId: "b-1",
          title: "Hidden from user A",
          content: "Only user B should see this in feed",
          mediaType: "article",
          publishedAt: new Date("2026-02-24T10:00:00.000Z"),
        },
      ],
    });

    requireAuthMock.mockResolvedValue({ user: { id: userA.id } });

    const response = await listPosts(new Request("http://localhost/api/posts?limit=20"));
    const payload = (await response.json()) as {
      success: boolean;
      data: Array<{ sourceId: string; title: string | null }>;
    };

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0]?.sourceId).toBe(sourceA.id);
    expect(payload.data[0]?.title).toBe("Visible to user A");
  });

  it("applies user scoping and free-plan lookback in search results", async () => {
    const user = await createUser({ email: "free-user@example.com", plan: "free" });
    const outsider = await createUser({ email: "outsider@example.com" });

    const sourceVisible = await createSource({
      type: "website",
      url: "https://visible.example.com",
      normalizedUrl: "website:visible.example.com",
      name: "Visible Source",
    });
    const sourceHidden = await createSource({
      type: "website",
      url: "https://hidden.example.com",
      normalizedUrl: "website:hidden.example.com",
      name: "Hidden Source",
    });

    await db.userSource.createMany({
      data: [
        { userId: user.id, sourceId: sourceVisible.id },
        { userId: outsider.id, sourceId: sourceHidden.id },
      ],
    });

    const now = new Date();
    const oldDate = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);

    await db.post.createMany({
      data: [
        {
          sourceId: sourceVisible.id,
          externalId: "visible-recent",
          title: "Recent visible match",
          content: "shared-keyword recent visible content",
          mediaType: "article",
          publishedAt: now,
        },
        {
          sourceId: sourceVisible.id,
          externalId: "visible-old",
          title: "Old visible match",
          content: "shared-keyword old content",
          mediaType: "article",
          publishedAt: oldDate,
        },
        {
          sourceId: sourceHidden.id,
          externalId: "hidden-recent",
          title: "Recent hidden match",
          content: "shared-keyword hidden content",
          mediaType: "article",
          publishedAt: now,
        },
      ],
    });

    requireAuthMock.mockResolvedValue({ user: { id: user.id } });

    const response = await searchPosts(new Request("http://localhost/api/search?q=shared-keyword&limit=50"));
    const payload = (await response.json()) as {
      success: boolean;
      data: Array<{ externalId: string | null }>;
    };

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.map((item) => item.externalId)).toEqual(["visible-recent"]);
  });

  it("does not allow mutating post state for unsubscribed posts", async () => {
    const owner = await createUser({ email: "owner@example.com" });
    const otherUser = await createUser({ email: "other@example.com" });

    const ownerSource = await createSource({
      type: "website",
      url: "https://owner.example.com",
      normalizedUrl: "website:owner.example.com",
      name: "Owner Source",
    });
    const otherSource = await createSource({
      type: "website",
      url: "https://other.example.com",
      normalizedUrl: "website:other.example.com",
      name: "Other Source",
    });

    await db.userSource.createMany({
      data: [
        { userId: owner.id, sourceId: ownerSource.id },
        { userId: otherUser.id, sourceId: otherSource.id },
      ],
    });

    const post = await db.post.create({
      data: {
        sourceId: ownerSource.id,
        externalId: "owner-post",
        title: "Owner only post",
        content: "Only subscribed user can update state",
        mediaType: "article",
        publishedAt: new Date("2026-02-24T09:30:00.000Z"),
      },
    });

    requireAuthMock.mockResolvedValue({ user: { id: otherUser.id } });

    const response = await patchPostState(
      new Request("http://localhost/api/posts/state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      }),
      { params: Promise.resolve({ id: post.id }) }
    );

    const payload = (await response.json()) as { success: boolean; error?: string };

    expect(response.status).toBe(404);
    expect(payload.success).toBe(false);
    expect(payload.error).toBe("Post not found");

    const state = await db.userPostState.findUnique({
      where: {
        userId_postId: {
          userId: otherUser.id,
          postId: post.id,
        },
      },
    });

    expect(state).toBeNull();
  });
});

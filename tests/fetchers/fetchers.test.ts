import { readFileSync } from "node:fs";
import path from "node:path";

import type { Source } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const parseURLMock = vi.fn();

vi.mock("rss-parser", () => {
  class ParserMock {
    parseURL = parseURLMock;
  }

  return {
    default: ParserMock,
  };
});

function fixturePath(name: string) {
  return path.resolve(process.cwd(), "tests", "fixtures", "fetchers", name);
}

function loadFixtureJson<T>(name: string): T {
  return JSON.parse(readFileSync(fixturePath(name), "utf8")) as T;
}

function loadFixtureText(name: string) {
  return readFileSync(fixturePath(name), "utf8");
}

function makeSource(overrides: Partial<Source>): Source {
  return {
    id: "source-test-id",
    type: "website",
    url: "https://example.com",
    normalizedUrl: "website:example.com",
    name: "Fixture Source",
    config: null,
    enabled: true,
    lastFetchedAt: null,
    lastFetchStatus: "never",
    createdAt: new Date("2026-02-01T00:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  parseURLMock.mockReset();
  process.env.YOUTUBE_API_KEY = "test-youtube-key";
  process.env.RSSHUB_BASE_URL = "http://rsshub.test";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchers with fixtures", () => {
  it("parses Substack posts and filters by since date", async () => {
    parseURLMock.mockResolvedValue(loadFixtureJson("substack-feed.json"));

    const { substackFetcher } = await import("@/lib/fetchers/substack");
    const source = makeSource({
      type: "substack",
      url: "newsletter.example.com",
      normalizedUrl: "substack:newsletter",
      name: "Fixture Newsletter",
    });

    const posts = await substackFetcher.fetch(source, new Date("2026-01-01T00:00:00.000Z"));

    expect(parseURLMock).toHaveBeenCalledWith("https://newsletter.example.com/feed");
    expect(posts).toHaveLength(1);
    expect(posts[0]?.externalId).toBe("sub-new-1");
    expect(posts[0]?.mediaType).toBe("article");
    expect(posts[0]?.metadata).toMatchObject({ readTimeMinutes: expect.any(Number) });
  });

  it("parses X feed through RSSHub fixture", async () => {
    parseURLMock.mockResolvedValue(loadFixtureJson("x-feed.json"));

    const { xFetcher } = await import("@/lib/fetchers/x");
    const source = makeSource({
      type: "x",
      url: "https://x.com/test_account",
      normalizedUrl: "x:test_account",
      name: "X Fixture",
    });

    const posts = await xFetcher.fetch(source, new Date("2026-01-01T00:00:00.000Z"));

    expect(parseURLMock).toHaveBeenCalledWith("http://rsshub.test/twitter/user/test_account");
    expect(posts).toHaveLength(1);
    expect(posts[0]?.externalId).toBe("x-guid-new");
    expect(posts[0]?.url).toContain("/status/123");
  });

  it("parses Telegram channel HTML fixture", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(loadFixtureText("telegram-channel.html"), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { telegramFetcher } = await import("@/lib/fetchers/telegram");
    const source = makeSource({
      type: "telegram",
      url: "https://t.me/testchannel",
      normalizedUrl: "telegram:testchannel",
      name: "Telegram Fixture",
    });

    const posts = await telegramFetcher.fetch(source, new Date("2026-01-01T00:00:00.000Z"));

    expect(fetchMock).toHaveBeenCalledWith("https://t.me/s/testchannel");
    expect(posts).toHaveLength(1);
    expect(posts[0]?.externalId).toBe("testchannel/200");
    expect(posts[0]?.metadata).toMatchObject({ viewCount: "1234" });
  });

  it("uses RSS fixture for website fetches when available", async () => {
    parseURLMock.mockResolvedValue(loadFixtureJson("website-rss-feed.json"));

    const { websiteFetcher } = await import("@/lib/fetchers/website");
    const source = makeSource({
      type: "website",
      url: "site.example.com/rss",
      normalizedUrl: "website:site.example.com",
      name: "Website Fixture",
    });

    const posts = await websiteFetcher.fetch(source, new Date("2026-01-01T00:00:00.000Z"));

    expect(parseURLMock).toHaveBeenCalledWith("https://site.example.com/rss");
    expect(posts).toHaveLength(1);
    expect(posts[0]?.externalId).toBe("web-rss-1");
    expect(posts[0]?.metadata).toMatchObject({ siteName: "Website Fixture" });
  });

  it("falls back to HTML extraction when website RSS parsing fails", async () => {
    parseURLMock.mockRejectedValue(new Error("No feed available"));

    const fetchMock = vi.fn(async () => {
      return new Response(loadFixtureText("website-fallback.html"), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { websiteFetcher } = await import("@/lib/fetchers/website");
    const source = makeSource({
      type: "website",
      url: "https://site.example.com/article",
      normalizedUrl: "website:site.example.com",
      name: "Website Fixture",
    });

    const posts = await websiteFetcher.fetch(source, new Date("2026-01-01T00:00:00.000Z"));

    expect(fetchMock).toHaveBeenCalledWith("https://site.example.com/article");
    expect(posts).toHaveLength(1);
    expect(posts[0]?.title).toBeTruthy();
    expect(posts[0]?.mediaType).toBe("article");
  });

  it("parses YouTube API fixture responses", async () => {
    const channelPayload = loadFixtureJson<Record<string, unknown>>("youtube-search-channel.json");
    const videosSearchPayload = loadFixtureJson<Record<string, unknown>>("youtube-search-videos.json");
    const videosPayload = loadFixtureJson<Record<string, unknown>>("youtube-videos.json");

    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.includes("type=channel")) {
        return new Response(JSON.stringify(channelPayload), { status: 200 });
      }

      if (url.includes("type=video")) {
        return new Response(JSON.stringify(videosSearchPayload), { status: 200 });
      }

      if (url.includes("/videos?")) {
        return new Response(JSON.stringify(videosPayload), { status: 200 });
      }

      return new Response("{}", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { youtubeFetcher } = await import("@/lib/fetchers/youtube");
    const source = makeSource({
      type: "youtube",
      url: "https://youtube.com/@fixture",
      normalizedUrl: "youtube:fixture",
      name: "YouTube Fixture",
    });

    const posts = await youtubeFetcher.fetch(source, new Date("2026-01-01T00:00:00.000Z"));

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(posts).toHaveLength(1);
    expect(posts[0]?.externalId).toBe("video_new_1");
    expect(posts[0]?.metadata).toMatchObject({
      embedUrl: "https://www.youtube.com/embed/video_new_1",
      viewCount: "1200",
    });
  });
});

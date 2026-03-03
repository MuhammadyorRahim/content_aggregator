import Parser from "rss-parser";

import { ensureProtocol, extractYoutubeHandle } from "@/lib/url-normalizer";

import { FetchError, type FetchResult, type FetchedPost, type Fetcher } from "./types";

const parser = new Parser<Record<string, unknown>, Record<string, unknown>>({
  timeout: 20_000,
  headers: { "User-Agent": "ContentAggregator/1.0" },
});

/**
 * Resolve a YouTube identifier (@handle or UC... channel ID) to a UC... channel ID.
 * Scrapes the YouTube page to extract the canonical channel ID.
 */
async function resolveChannelId(identifier: string): Promise<string> {
  // Already a channel ID (starts with UC, 24 chars)
  if (identifier.startsWith("UC") && identifier.length === 24) {
    return identifier;
  }

  const handle = identifier.replace(/^@/, "");
  const pageUrl = `https://www.youtube.com/@${handle}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  let res;
  try {
    res = await fetch(pageUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
    });
  } catch (error) {
    clearTimeout(timer);
    throw new FetchError(
      `Failed to resolve YouTube handle @${handle}: ${error instanceof Error ? error.message : String(error)}`,
      "network"
    );
  }
  clearTimeout(timer);

  if (!res.ok) {
    throw new FetchError(
      `YouTube returned HTTP ${res.status} for @${handle} — channel may not exist`,
      "network"
    );
  }

  const html = await res.text();

  const patterns = [
    /"channelId":"(UC[A-Za-z0-9_-]{22})"/,
    /"externalId":"(UC[A-Za-z0-9_-]{22})"/,
    /channel_id=(UC[A-Za-z0-9_-]{22})/,
    /\/channel\/(UC[A-Za-z0-9_-]{22})/,
    /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})">/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return match[1];
    }
  }

  throw new FetchError(
    `Could not find channel ID for @${handle}. Try using the channel ID directly (starts with UC, 24 chars).`,
    "parse"
  );
}

export const youtubeFetcher: Fetcher = {
  async fetch(source, since): Promise<FetchResult> {
    const normalizedId = source.normalizedUrl.startsWith("youtube:")
      ? source.normalizedUrl.slice("youtube:".length)
      : extractYoutubeHandle(ensureProtocol(source.url));

    const channelId = await resolveChannelId(normalizedId);
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

    let feed;
    try {
      feed = await parser.parseURL(feedUrl);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new FetchError(
        `Failed to fetch YouTube RSS feed: ${msg} (URL: ${feedUrl})`,
        "network"
      );
    }

    const posts: FetchedPost[] = [];
    const channelTitle = (feed.title as string | undefined) ?? source.name;

    for (const item of feed.items ?? []) {
      const publishedRaw = (item.isoDate as string | undefined) ?? (item.pubDate as string | undefined);
      if (!publishedRaw) continue;

      const publishedAt = new Date(publishedRaw);
      if (Number.isNaN(publishedAt.getTime()) || publishedAt < since) continue;

      // YouTube Atom feed uses yt:videoId format in the id field
      const rawId = (item.id as string | undefined) ?? "";
      const videoId = rawId.replace("yt:video:", "") || (item.link as string | undefined)?.match(/v=([^&]+)/)?.[1] || "";

      if (!videoId) continue;

      const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      posts.push({
        externalId: videoId,
        title: (item.title as string | undefined) ?? undefined,
        content: (item.content as string | undefined) ?? (item.contentSnippet as string | undefined) ?? "",
        author: channelTitle,
        url: (item.link as string | undefined) ?? `https://www.youtube.com/watch?v=${videoId}`,
        imageUrl: thumbnail,
        mediaType: "video" as const,
        metadata: {
          thumbnailUrl: thumbnail,
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
        },
        publishedAt: new Date(publishedAt.toISOString()),
      });
    }

    if (!posts.length && !feed.items?.length) {
      return { posts: [], warning: "YouTube feed returned no items." };
    }

    return { posts };
  },
};

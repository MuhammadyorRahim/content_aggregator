import Parser from "rss-parser";

import { ensureProtocol } from "@/lib/url-normalizer";

import { FetchError, type FetchResult, type FetchedPost, type Fetcher } from "./types";

const parser = new Parser<Record<string, unknown>, Record<string, unknown>>({
  timeout: 20_000,
  headers: { "User-Agent": "ContentAggregator/1.0" },
});

function estimateReadTimeMinutes(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export const substackFetcher: Fetcher = {
  async fetch(source, since): Promise<FetchResult> {
    const baseUrl = ensureProtocol(source.url);
    const feedUrl = baseUrl.endsWith("/feed") ? baseUrl : `${baseUrl.replace(/\/$/, "")}/feed`;

    let feed;
    try {
      feed = await parser.parseURL(feedUrl);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);

      let message = `Substack RSS: ${msg}`;
      if (msg.includes("404") || msg.includes("Not Found")) {
        const hostname = new URL(feedUrl).hostname;
        const subdomain = hostname.split(".")[0];
        message = `Substack newsletter "${subdomain}" not found. Check the username — it should be the subdomain from ${subdomain}.substack.com`;
      } else if (msg.includes("ENOTFOUND") || msg.includes("getaddrinfo")) {
        message = `Cannot reach ${new URL(feedUrl).hostname} — check your internet connection or the username spelling`;
      } else if (msg.includes("timeout") || msg.includes("ETIMEDOUT")) {
        message = `Substack feed timed out — try again later`;
      }

      throw new FetchError(message, "network");
    }

    if (!feed.items?.length) {
      return { posts: [], warning: "Substack feed loaded but contains 0 items — newsletter may have no public posts." };
    }

    const posts: FetchedPost[] = [];

    for (const item of feed.items ?? []) {
      const publishedRaw = (item.isoDate as string | undefined) ?? (item.pubDate as string | undefined);
      if (!publishedRaw) continue;

      const publishedAt = new Date(publishedRaw);
      if (Number.isNaN(publishedAt.getTime()) || publishedAt < since) continue;

      const content =
        (item["content:encoded"] as string | undefined) ??
        (item.content as string | undefined) ??
        (item.contentSnippet as string | undefined) ??
        "";

      const link = (item.link as string | undefined) ?? undefined;
      const externalId = (item.guid as string | undefined) ?? link ?? `${source.normalizedUrl}:${publishedAt.toISOString()}`;

      // Extract thumbnail from content
      const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
      const imageUrl = imgMatch ? imgMatch[1].replace(/&amp;/g, "&") : undefined;

      posts.push({
        externalId,
        title: (item.title as string | undefined) ?? undefined,
        content,
        author: (item.creator as string | undefined) ?? (item.author as string | undefined) ?? source.name,
        url: link,
        imageUrl,
        mediaType: "article" as const,
        metadata: {
          readTimeMinutes: estimateReadTimeMinutes(content),
        },
        publishedAt: new Date(publishedAt.toISOString()),
      });
    }

    return { posts };
  },
};

import Parser from "rss-parser";

import { ensureProtocol } from "@/lib/url-normalizer";

import { FetchError, type FetchResult, type FetchedPost, type Fetcher } from "./types";

const parser = new Parser<Record<string, unknown>, Record<string, unknown>>();

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
      throw new FetchError(
        `Failed to parse Substack RSS feed at ${feedUrl}. Error: ${msg}`,
        "network"
      );
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

        posts.push({
          externalId,
          title: (item.title as string | undefined) ?? undefined,
          content,
          author: (item.creator as string | undefined) ?? (item.author as string | undefined) ?? source.name,
          url: link,
          imageUrl: undefined,
          mediaType: "article" as const,
          metadata: {
            readTimeMinutes: estimateReadTimeMinutes(content),
          },
          publishedAt: new Date(publishedAt.toISOString()),
        });
    }

    if (!posts.length && !feed.items?.length) {
      return { posts: [], warning: "Substack feed returned no items. The newsletter may have no public posts." };
    }

    return { posts };
  },
};

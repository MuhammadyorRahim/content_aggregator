import Parser from "rss-parser";

import { FetchError, type FetchResult, type FetchedPost, type Fetcher } from "./types";

const parser = new Parser<Record<string, unknown>, Record<string, unknown>>();

function extractXUsername(sourceUrl: string, normalizedUrl: string) {
  if (normalizedUrl.startsWith("x:")) {
    return normalizedUrl.slice(2);
  }

  return sourceUrl
    .replace(/https?:\/\/(twitter|x)\.com\//i, "")
    .replace(/^@/, "")
    .split("/")[0]
    .trim()
    .toLowerCase();
}

export const xFetcher: Fetcher = {
  async fetch(source, since): Promise<FetchResult> {
    const baseUrl = process.env.RSSHUB_BASE_URL ?? "http://localhost:1200";
    const username = extractXUsername(source.url, source.normalizedUrl);

    if (!username) {
      throw new FetchError("Could not extract X/Twitter username from the URL.", "parse");
    }

    const rssUrl = `${baseUrl.replace(/\/$/, "")}/twitter/user/${username}`;

    let feed;
    try {
      feed = await parser.parseURL(rssUrl);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new FetchError(
        `Failed to fetch X/Twitter feed from RSSHub (${rssUrl}). Is RSSHub running? Error: ${msg}`,
        "network"
      );
    }

    const posts: FetchedPost[] = [];

    for (const item of feed.items ?? []) {
        const publishedRaw = (item.isoDate as string | undefined) ?? (item.pubDate as string | undefined);
        const link = (item.link as string | undefined) ?? undefined;
        const guid = (item.guid as string | undefined) ?? undefined;

        if (!publishedRaw || !guid) continue;

        const publishedAt = new Date(publishedRaw);
        if (Number.isNaN(publishedAt.getTime()) || publishedAt < since) continue;

        const content =
          (item["content:encoded"] as string | undefined) ??
          (item.content as string | undefined) ??
          (item.contentSnippet as string | undefined) ??
          "";

        posts.push({
          externalId: guid,
          title: undefined,
          content,
          author: (item.creator as string | undefined) ?? (item.author as string | undefined) ?? source.name,
          url: link,
          imageUrl: undefined,
          mediaType: "text" as const,
          metadata: {},
          publishedAt: new Date(publishedAt.toISOString()),
        });
    }

    if (!posts.length && !feed.items?.length) {
      return { posts: [], warning: "Feed returned no items. The account may be private or the RSSHub route may be unavailable." };
    }

    return { posts };
  },
};

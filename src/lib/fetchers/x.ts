import Parser from "rss-parser";

import type { FetchedPost, Fetcher } from "./types";

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
  async fetch(source, since) {
    const baseUrl = process.env.RSSHUB_BASE_URL ?? "http://localhost:1200";
    const username = extractXUsername(source.url, source.normalizedUrl);

    if (!username) {
      return [];
    }

    const rssUrl = `${baseUrl.replace(/\/$/, "")}/twitter/user/${username}`;
    const feed = await parser.parseURL(rssUrl);

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

    return posts;
  },
};

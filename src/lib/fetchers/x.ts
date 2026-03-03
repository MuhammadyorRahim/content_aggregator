import Parser from "rss-parser";
import { load } from "cheerio";

import { FetchError, type FetchResult, type FetchedPost, type Fetcher } from "./types";

const parser = new Parser<Record<string, unknown>, Record<string, unknown>>({
  timeout: 20_000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  },
  customFields: {
    item: [["media:content", "mediaContent", { keepArray: true }]],
  },
});

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

/**
 * Build an RSSHub URL with optimized route params for cleaner output.
 */
function buildRssHubUrl(base: string, username: string) {
  const params = new URLSearchParams({
    count: "40",
    includeRts: "false",
    includeReplies: "false",
  });
  return `${base}/twitter/user/${username}/${params.toString()}`;
}

/**
 * Fetch a feed URL with timeout and a single retry.
 */
async function fetchFeedWithRetry(url: string, timeoutMs = 20_000): Promise<string> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "ContentAggregator/1.0",
          Accept: "application/rss+xml, application/xml, text/xml",
        },
      });
      clearTimeout(timer);

      if (!res.ok) {
        const body = await res.text().catch(() => "");

        if (attempt === 1 && res.status >= 500) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }

        throw new FetchError(
          `RSSHub returned HTTP ${res.status}: ${body.slice(0, 200)}`,
          "network"
        );
      }

      return await res.text();
    } catch (err) {
      if (err instanceof FetchError) throw err;

      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      const msg = err instanceof Error ? err.message : String(err);
      throw new FetchError(
        `Failed to fetch from RSSHub: ${msg}`,
        "network"
      );
    }
  }

  throw new FetchError("All fetch attempts failed", "network");
}

export const xFetcher: Fetcher = {
  async fetch(source, since): Promise<FetchResult> {
    const rsshubBase = (process.env.RSSHUB_BASE_URL ?? "http://localhost:1200").replace(/\/+$/, "");
    const username = extractXUsername(source.url, source.normalizedUrl);

    if (!username) {
      throw new FetchError("Could not extract X/Twitter username from the URL.", "parse");
    }

    const feedUrl = buildRssHubUrl(rsshubBase, username);

    let feedXml: string;
    try {
      feedXml = await fetchFeedWithRetry(feedUrl);
    } catch (error) {
      if (error instanceof FetchError) throw error;
      const msg = error instanceof Error ? error.message : String(error);
      throw new FetchError(
        `Failed to fetch X/Twitter feed from RSSHub (${feedUrl}). Is RSSHub running? ` +
          (process.env.TWITTER_AUTH_TOKEN
            ? `Error: ${msg}`
            : `TWITTER_AUTH_TOKEN may not be set in RSSHub. Error: ${msg}`),
        "network"
      );
    }

    let feed;
    try {
      feed = await parser.parseString(feedXml);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new FetchError(`Failed to parse RSSHub XML for @${username}: ${msg}`, "parse");
    }

    if (!feed.items?.length) {
      throw new FetchError(
        `RSSHub returned an empty feed for @${username}. ` +
          (process.env.TWITTER_AUTH_TOKEN
            ? "Twitter may have invalidated the auth_token — regenerate it."
            : "TWITTER_AUTH_TOKEN is not set in RSSHub environment."),
        "empty"
      );
    }

    const posts: FetchedPost[] = [];

    for (const item of feed.items ?? []) {
      const publishedRaw = (item.isoDate as string | undefined) ?? (item.pubDate as string | undefined);
      const link = (item.link as string | undefined) ?? "";
      const guid = (item.guid as string | undefined) ?? "";

      if (!publishedRaw) continue;

      const publishedAt = new Date(publishedRaw);
      if (Number.isNaN(publishedAt.getTime()) || publishedAt < since) continue;

      // Extract tweet ID from URL
      const tweetIdMatch = guid.match(/\/status\/(\d+)/) ?? link.match(/\/status\/(\d+)/);
      const tweetId = tweetIdMatch?.[1];

      const rawHtml =
        (item.content as string | undefined) ??
        (item["content:encoded"] as string | undefined) ??
        (item.contentSnippet as string | undefined) ??
        "";

      // Parse HTML with cheerio to extract media
      let imageUrl: string | undefined;
      let bodyHtml = rawHtml;
      if (rawHtml) {
        const $ = load(rawHtml);

        // Extract first image outside quoted tweets
        const $img = $("img").not(".rsshub-quote img").first();
        if ($img.length) {
          imageUrl = $img.attr("src") ?? undefined;
          $img.remove(); // Remove so body doesn't duplicate media
        }

        bodyHtml = $("body").html() ?? rawHtml;
      }

      const externalId = tweetId ? `twitter:${tweetId}` : guid || `twitter:${username}:${publishedRaw}`;

      posts.push({
        externalId,
        title: undefined,
        content: bodyHtml,
        author: (item.creator as string | undefined) ?? (item.author as string | undefined) ?? source.name,
        url: tweetId ? `https://x.com/${username}/status/${tweetId}` : link,
        imageUrl,
        mediaType: imageUrl ? "image" : "text",
        metadata: {},
        publishedAt: new Date(publishedAt.toISOString()),
      });
    }

    return { posts };
  },
};

import crypto from "crypto";

import { load } from "cheerio";
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

function decodeHtmlEntities(str: string) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;/g, "'");
}

function extractImage(html: string): string | undefined {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? decodeHtmlEntities(match[1]) : undefined;
}

export const websiteFetcher: Fetcher = {
  async fetch(source, since): Promise<FetchResult> {
    const websiteUrl = ensureProtocol(source.url);

    // Try RSS first
    try {
      const feed = await parser.parseURL(websiteUrl);
      const siteTitle = (feed.title as string | undefined) ?? source.name;

      if (!feed.items?.length) {
        return { posts: [], warning: "RSS feed loaded but contains 0 items." };
      }

      const rssPosts: FetchedPost[] = [];

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

        const url = (item.link as string | undefined) ?? undefined;
        const externalId =
          (item.guid as string | undefined) ??
          url ??
          crypto.createHash("sha256").update(`${source.normalizedUrl}:${publishedAt.toISOString()}`).digest("hex");

        // Extract image from enclosure or content
        const enclosureUrl = (item.enclosure as { url?: string } | undefined)?.url;
        const imageUrl = enclosureUrl ?? extractImage(content);

        rssPosts.push({
          externalId,
          title: (item.title as string | undefined) ?? undefined,
          content,
          author: (item.creator as string | undefined) ?? (item.author as string | undefined) ?? siteTitle,
          url,
          imageUrl,
          mediaType: "article" as const,
          metadata: {
            siteName: siteTitle,
            readTimeMinutes: estimateReadTimeMinutes(content),
          },
          publishedAt: new Date(publishedAt.toISOString()),
        });
      }

      return { posts: rssPosts };
    } catch (error) {
      // Not a valid RSS feed — try HTML fallback
      const msg = error instanceof Error ? error.message : String(error);

      // If the error is clearly a network issue, throw it
      if (msg.includes("ENOTFOUND") || msg.includes("getaddrinfo")) {
        throw new FetchError(
          `Cannot reach ${new URL(websiteUrl).hostname} — check URL spelling or internet connection`,
          "network"
        );
      }

      if (msg.includes("timeout") || msg.includes("ETIMEDOUT")) {
        throw new FetchError(`Feed request timed out for "${websiteUrl}" — try again later`, "network");
      }

      // For XML parse errors, fall through to HTML scraping
    }

    // Fallback to HTML scraping
    let response;
    try {
      response = await fetch(websiteUrl);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new FetchError(`Network error fetching ${websiteUrl}: ${msg}`, "network");
    }

    if (!response.ok) {
      throw new FetchError(`Website returned HTTP ${response.status} for ${websiteUrl}.`, "network");
    }

    const html = await response.text();
    const $ = load(html);

    const title =
      $("meta[property='og:title']").attr("content") ??
      $("title").text().trim() ??
      source.name;

    const content =
      $("article").first().html() ??
      $("main").first().html() ??
      $("body").html() ??
      "";

    const publishedRaw =
      $("meta[property='article:published_time']").attr("content") ??
      $("time").first().attr("datetime") ??
      new Date().toISOString();

    const publishedAt = new Date(publishedRaw);
    if (Number.isNaN(publishedAt.getTime()) || publishedAt < since) {
      return { posts: [], warning: `Page content is older than ${since.toISOString().split("T")[0]} or has no date.` };
    }

    const imageUrl =
      $("meta[property='og:image']").attr("content") ??
      $("article img").first().attr("src") ??
      undefined;

    const externalId = crypto.createHash("sha256").update(websiteUrl + publishedAt.toISOString()).digest("hex");

    return {
      posts: [
        {
          externalId,
          title,
          content,
          author: source.name,
          url: websiteUrl,
          imageUrl,
          mediaType: "article",
          metadata: {
            siteName: source.name,
            readTimeMinutes: estimateReadTimeMinutes(content),
          },
          publishedAt: new Date(publishedAt.toISOString()),
        },
      ],
    };
  },
};

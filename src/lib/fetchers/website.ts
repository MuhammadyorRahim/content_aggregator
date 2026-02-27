import crypto from "crypto";

import { Readability } from "@mozilla/readability";
import { load } from "cheerio";
import Parser from "rss-parser";

import { ensureProtocol } from "@/lib/url-normalizer";

import type { FetchedPost, Fetcher } from "./types";

const parser = new Parser<Record<string, unknown>, Record<string, unknown>>();

function estimateReadTimeMinutes(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

async function parseWithReadability(html: string, url: string): Promise<{ title?: string; content?: string } | null> {
  try {
    const { JSDOM } = await import("jsdom");
    const dom = new JSDOM(html, { url });
    const article = new Readability(dom.window.document).parse();

    if (!article) return null;

    return {
      title: article.title ?? undefined,
      content: article.content || article.textContent || undefined,
    };
  } catch {
    return null;
  }
}

export const websiteFetcher: Fetcher = {
  async fetch(source, since) {
    const websiteUrl = ensureProtocol(source.url);

    try {
      const feed = await parser.parseURL(websiteUrl);
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

          rssPosts.push({
            externalId,
            title: (item.title as string | undefined) ?? undefined,
            content,
            author: (item.creator as string | undefined) ?? (item.author as string | undefined) ?? source.name,
            url,
            imageUrl: undefined,
            mediaType: "article" as const,
            metadata: {
              siteName: source.name,
              readTimeMinutes: estimateReadTimeMinutes(content),
            },
            publishedAt: new Date(publishedAt.toISOString()),
          });
      }

      if (rssPosts.length) {
        return rssPosts;
      }
    } catch {
      // fallback to HTML extraction
    }

    const response = await fetch(websiteUrl);
    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    const readability = await parseWithReadability(html, websiteUrl);
    const $ = load(html);

    const title =
      readability?.title ??
      $("meta[property='og:title']").attr("content") ??
      $("title").text().trim() ??
      source.name;

    const content =
      readability?.content ??
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
      return [];
    }

    const imageUrl =
      $("meta[property='og:image']").attr("content") ??
      $("article img").first().attr("src") ??
      undefined;

    const externalId = crypto.createHash("sha256").update(websiteUrl + publishedAt.toISOString()).digest("hex");

    return [
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
    ];
  },
};

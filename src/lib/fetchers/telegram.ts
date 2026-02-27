import { load } from "cheerio";

import { ensureProtocol } from "@/lib/url-normalizer";

import type { FetchedPost, Fetcher } from "./types";

function normalizeTelegramPublicUrl(input: string) {
  const url = ensureProtocol(input).replace(/\/$/, "");

  if (/\/s\//.test(url)) {
    return url;
  }

  return url.replace("t.me/", "t.me/s/");
}

export const telegramFetcher: Fetcher = {
  async fetch(source, since) {
    const url = normalizeTelegramPublicUrl(source.url);
    const response = await fetch(url);
    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    const $ = load(html);

    const posts: FetchedPost[] = [];

    $(".tgme_widget_message_wrap").each((_, element) => {
      const container = $(element);
      const postDataId = container.find(".tgme_widget_message").attr("data-post");
      const datetime = container.find("time").attr("datetime");

      if (!postDataId || !datetime) {
        return;
      }

      const publishedAt = new Date(datetime);
      if (Number.isNaN(publishedAt.getTime()) || publishedAt < since) {
        return;
      }

      const textHtml = container.find(".tgme_widget_message_text").html() ?? "";
      const messageUrl = container.find("a.tgme_widget_message_date").attr("href") ?? undefined;
      const imageUrl = container.find(".tgme_widget_message_photo_wrap img").attr("src") ?? undefined;
      const views = container.find(".tgme_widget_message_views").text().trim();

      posts.push({
        externalId: postDataId,
        title: undefined,
        content: textHtml,
        author: source.name,
        url: messageUrl,
        imageUrl,
        mediaType: imageUrl ? "image" : "text",
        metadata: {
          viewCount: views || undefined,
        },
        publishedAt: new Date(publishedAt.toISOString()),
      });
    });

    return posts;
  },
};

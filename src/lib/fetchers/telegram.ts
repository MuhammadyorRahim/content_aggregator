import { load } from "cheerio";

import { ensureProtocol } from "@/lib/url-normalizer";

import { FetchError, type FetchResult, type FetchedPost, type Fetcher } from "./types";

function normalizeTelegramPublicUrl(input: string) {
  const url = ensureProtocol(input).replace(/\/$/, "");

  if (/\/s\//.test(url)) {
    return url;
  }

  return url.replace("t.me/", "t.me/s/");
}

function extractChannel(input: string) {
  return input
    .replace(/https?:\/\/t\.me\/(s\/)?/i, "")
    .replace(/^@/, "")
    .split("/")[0]
    .trim();
}

export const telegramFetcher: Fetcher = {
  async fetch(source, since): Promise<FetchResult> {
    const url = normalizeTelegramPublicUrl(source.url);
    const channel = extractChannel(source.url);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);

    let response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
    } catch (error) {
      clearTimeout(timer);
      const msg = error instanceof Error ? error.message : String(error);
      throw new FetchError(`Network error fetching Telegram channel at ${url}: ${msg}`, "network");
    }
    clearTimeout(timer);

    if (!response.ok) {
      throw new FetchError(
        `Telegram returned HTTP ${response.status} for ${url}. The channel may be private or not exist.`,
        "network"
      );
    }

    const html = await response.text();
    const $ = load(html);

    const posts: FetchedPost[] = [];

    $(".tgme_widget_message_wrap").each((_, element) => {
      const container = $(element);
      const messageEl = container.find(".tgme_widget_message");
      const postDataId = messageEl.attr("data-post");
      const datetime = container.find("time").attr("datetime");

      if (!postDataId || !datetime) {
        return;
      }

      const publishedAt = new Date(datetime);
      if (Number.isNaN(publishedAt.getTime()) || publishedAt < since) {
        return;
      }

      const textHtml = container.find(".tgme_widget_message_text").html() ?? "";

      // Extract photo from background style
      const photoStyle = container.find(".tgme_widget_message_photo_wrap").attr("style") ?? "";
      const photoMatch = photoStyle.match(/url\('([^']+)'\)/);
      const photoUrl = photoMatch ? photoMatch[1] : undefined;

      // Also check for direct img
      const directImg = container.find(".tgme_widget_message_photo_wrap img").attr("src") ?? undefined;

      // Video detection
      const hasVideoPlayer =
        container.find(".tgme_widget_message_video_player").length > 0 ||
        container.find(".tgme_widget_message_video").length > 0 ||
        container.find("video").length > 0;
      const hasRoundVideo = container.find(".tgme_widget_message_roundvideo_player").length > 0;
      const isVideo = hasVideoPlayer || hasRoundVideo;

      // Video thumbnail
      const videoThumbStyle = container.find(".tgme_widget_message_video_thumb").attr("style") ?? "";
      const videoThumbMatch = videoThumbStyle.match(/url\('([^']+)'\)/);
      const videoThumbUrl = videoThumbMatch ? videoThumbMatch[1] : undefined;

      const imageUrl = isVideo ? (videoThumbUrl ?? photoUrl) : (photoUrl ?? directImg);
      const messageUrl = `https://t.me/${postDataId}`;
      const views = container.find(".tgme_widget_message_views").text().trim();

      let mediaType: "text" | "video" | "image" = "text";
      if (isVideo) mediaType = "video";
      else if (imageUrl) mediaType = "image";

      if (textHtml.trim() || imageUrl || isVideo) {
        posts.push({
          externalId: postDataId,
          title: undefined,
          content: textHtml,
          author: `@${channel}`,
          url: messageUrl,
          imageUrl,
          mediaType,
          metadata: {
            viewCount: views || undefined,
          },
          publishedAt: new Date(publishedAt.toISOString()),
        });
      }
    });

    if (!posts.length && !$(".tgme_widget_message_wrap").length) {
      return { posts: [], warning: "No messages found. The channel may be private or empty." };
    }

    return { posts };
  },
};

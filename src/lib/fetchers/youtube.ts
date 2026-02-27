import { ensureProtocol, extractYoutubeHandle } from "@/lib/url-normalizer";

import type { FetchedPost, Fetcher } from "./types";

type YouTubeSearchResponse = {
  items?: Array<{
    id?: { videoId?: string; channelId?: string };
    snippet?: {
      channelId?: string;
      channelTitle?: string;
      publishedAt?: string;
      title?: string;
      description?: string;
      thumbnails?: {
        high?: { url?: string };
      };
    };
  }>;
};

type YouTubeVideosResponse = {
  items?: Array<{
    id?: string;
    snippet?: {
      channelTitle?: string;
      publishedAt?: string;
      title?: string;
      description?: string;
      thumbnails?: {
        high?: { url?: string };
      };
    };
    contentDetails?: {
      duration?: string;
    };
    statistics?: {
      viewCount?: string;
    };
  }>;
};

async function getChannelId(apiKey: string, sourceIdentifier: string) {
  if (sourceIdentifier.startsWith("UC")) {
    return sourceIdentifier;
  }

  const query = encodeURIComponent(sourceIdentifier);
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=1&q=${query}&key=${apiKey}`;
  const response = await fetch(searchUrl);
  if (!response.ok) return null;

  const data = (await response.json()) as YouTubeSearchResponse;
  return data.items?.[0]?.id?.channelId ?? data.items?.[0]?.snippet?.channelId ?? null;
}

export const youtubeFetcher: Fetcher = {
  async fetch(source, since) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return [];
    }

    const normalizedId = source.normalizedUrl.startsWith("youtube:")
      ? source.normalizedUrl.slice("youtube:".length)
      : extractYoutubeHandle(ensureProtocol(source.url));

    const channelId = await getChannelId(apiKey, normalizedId);
    if (!channelId) {
      return [];
    }

    const publishedAfter = encodeURIComponent(since.toISOString());
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=25&order=date&type=video&publishedAfter=${publishedAfter}&key=${apiKey}`;
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      return [];
    }

    const searchData = (await searchResponse.json()) as YouTubeSearchResponse;
    const videoIds = (searchData.items ?? [])
      .map((item) => item.id?.videoId)
      .filter((value): value is string => Boolean(value));

    if (!videoIds.length) {
      return [];
    }

    const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(",")}&key=${apiKey}`;
    const videosResponse = await fetch(videosUrl);
    if (!videosResponse.ok) {
      return [];
    }

    const videosData = (await videosResponse.json()) as YouTubeVideosResponse;

    const posts: FetchedPost[] = [];

    for (const video of videosData.items ?? []) {
        const videoId = video.id;
        const publishedAtRaw = video.snippet?.publishedAt;

        if (!videoId || !publishedAtRaw) continue;

        const publishedAt = new Date(publishedAtRaw);
        if (Number.isNaN(publishedAt.getTime()) || publishedAt < since) continue;

        posts.push({
          externalId: videoId,
          title: video.snippet?.title,
          content: video.snippet?.description ?? "",
          author: video.snippet?.channelTitle ?? source.name,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          imageUrl: video.snippet?.thumbnails?.high?.url,
          mediaType: "video" as const,
          metadata: {
            duration: video.contentDetails?.duration,
            viewCount: video.statistics?.viewCount,
            thumbnailUrl: video.snippet?.thumbnails?.high?.url,
            embedUrl: `https://www.youtube.com/embed/${videoId}`,
          },
          publishedAt: new Date(publishedAt.toISOString()),
        });
    }

    return posts;
  },
};

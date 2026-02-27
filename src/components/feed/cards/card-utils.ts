import type { FeedPostItem } from "@/types/feed";

export function stripHtml(input: string) {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function shortExcerpt(input: string, length = 280) {
  const text = stripHtml(input);
  if (text.length <= length) {
    return text;
  }
  return `${text.slice(0, length)}...`;
}

export function formatPublishedAt(value: string) {
  return new Date(value).toLocaleString();
}

function metadataObject(post: FeedPostItem) {
  if (!post.metadata) {
    return null;
  }

  try {
    return JSON.parse(post.metadata) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractYouTubeIdFromUrl(url: string) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "").trim() || null;
    }

    if (parsed.hostname.includes("youtube.com")) {
      const direct = parsed.searchParams.get("v");
      if (direct) {
        return direct;
      }

      const embedPath = parsed.pathname.match(/\/embed\/([^/]+)/);
      if (embedPath?.[1]) {
        return embedPath[1];
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function getYouTubeVideoId(post: FeedPostItem) {
  const metadata = metadataObject(post);

  const metadataVideoId =
    typeof metadata?.videoId === "string"
      ? metadata.videoId
      : typeof metadata?.id === "string"
        ? metadata.id
        : null;

  if (metadataVideoId) {
    return metadataVideoId;
  }

  if (post.url) {
    return extractYouTubeIdFromUrl(post.url);
  }

  return post.externalId;
}

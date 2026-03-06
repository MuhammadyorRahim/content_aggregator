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

// --- Tweet-specific helpers ---

export type ParsedTweetContent = {
  mainText: string;
  quote: { authorHandle: string; text: string } | null;
};

/**
 * Parse RSSHub tweet HTML into main text and optional quoted tweet.
 * Handles `<blockquote class="rsshub-quote">` structure.
 */
export function parseTweetContent(html: string): ParsedTweetContent {
  // Extract blockquote with rsshub-quote class
  const quoteMatch = html.match(
    /<blockquote[^>]*class="rsshub-quote"[^>]*>([\s\S]*?)<\/blockquote>/i
  );

  let mainHtml = html;
  let quote: ParsedTweetContent["quote"] = null;

  if (quoteMatch) {
    // Remove the blockquote from main content
    mainHtml = html.replace(quoteMatch[0], "").trim();

    const quoteHtml = quoteMatch[1];

    // Extract author handle from <a> tag inside the quote
    const handleMatch = quoteHtml.match(/<a[^>]*>@?([^<]+)<\/a>/i);
    const authorHandle = handleMatch ? handleMatch[1].trim() : "";

    // Get text after the handle link, strip HTML
    let quoteText = quoteHtml;
    if (handleMatch) {
      quoteText = quoteHtml.replace(handleMatch[0], "").trim();
      // Remove leading colon/dash separators
      quoteText = quoteText.replace(/^[\s:–—-]+/, "");
    }
    quoteText = stripHtml(quoteText);

    if (authorHandle || quoteText) {
      quote = { authorHandle, text: quoteText };
    }
  }

  const mainText = stripHtml(mainHtml);
  return { mainText, quote };
}

/**
 * Truncate a URL for display: "github.com/googleworkspac..."
 */
export function truncateUrl(url: string, maxLength = 35): string {
  const display = url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "");
  if (display.length <= maxLength) return display;
  return display.slice(0, maxLength) + "…";
}

/**
 * Replace raw URLs in text with truncated versions for display.
 */
export function truncateUrlsInText(text: string, maxLength = 35): string {
  return text.replace(/https?:\/\/[^\s]+/g, (url) => truncateUrl(url, maxLength));
}

/**
 * Extract @username from an x.com URL like "https://x.com/username/status/123"
 */
export function extractHandleFromUrl(url: string): string | null {
  const match = url.match(/(?:x|twitter)\.com\/([^/]+)/i);
  if (!match || !match[1]) return null;
  const handle = match[1].toLowerCase();
  // Filter out non-user paths
  if (["home", "search", "explore", "settings", "i"].includes(handle)) return null;
  return handle;
}

/**
 * Format a date as relative/short: "2h", "Mar 5", "Dec 12, 2024"
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const sameYear = date.getFullYear() === now.getFullYear();
  if (sameYear) {
    return `${months[date.getMonth()]} ${date.getDate()}`;
  }
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
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

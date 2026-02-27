import sanitizeHtml from "sanitize-html";

import { detectCategory } from "@/lib/categorizer";
import { CONTENT_START_DATE, MAX_POST_CONTENT_BYTES } from "@/lib/constants";
import type { FetchedPost } from "@/lib/fetchers/types";

export type ProcessedFetchedPost = FetchedPost & {
  category: string;
};

function truncateToBytes(input: string, maxBytes: number) {
  const buffer = Buffer.from(input, "utf8");
  if (buffer.byteLength <= maxBytes) {
    return input;
  }

  const suffix = "\n\n[Content truncated]";
  const allowedBytes = Math.max(0, maxBytes - Buffer.byteLength(suffix));
  return buffer.subarray(0, allowedBytes).toString("utf8") + suffix;
}

function sanitizeContent(content: string) {
  return sanitizeHtml(content, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2", "h3", "pre", "code", "iframe"]),
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt"],
      iframe: ["src", "allow", "allowfullscreen", "frameborder"],
      "*": ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
}

export function processFetchedPosts(posts: FetchedPost[]): ProcessedFetchedPost[] {
  return posts
    .filter((post) => new Date(post.publishedAt) >= CONTENT_START_DATE)
    .map((post) => {
      const publishedAt = new Date(new Date(post.publishedAt).toISOString());
      const sanitized = sanitizeContent(post.content);
      const truncated = truncateToBytes(sanitized, MAX_POST_CONTENT_BYTES);

      return {
        ...post,
        publishedAt,
        content: truncated,
        category: detectCategory({
          title: post.title,
          content: truncated,
        }),
      };
    });
}

import type { Source } from "@prisma/client";

export interface FetchedPost {
  externalId: string;
  title?: string;
  content: string;
  author?: string;
  url?: string;
  imageUrl?: string;
  mediaType: "text" | "video" | "image" | "article";
  metadata?: Record<string, unknown>;
  publishedAt: Date;
}

export interface Fetcher {
  fetch(source: Source, since: Date): Promise<FetchedPost[]>;
}

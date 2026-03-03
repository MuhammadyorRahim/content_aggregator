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

export interface FetchResult {
  posts: FetchedPost[];
  warning?: string;
}

export class FetchError extends Error {
  public readonly reason: "config" | "network" | "parse" | "empty";

  constructor(message: string, reason: "config" | "network" | "parse" | "empty") {
    super(message);
    this.name = "FetchError";
    this.reason = reason;
  }
}

export interface Fetcher {
  fetch(source: Source, since: Date): Promise<FetchResult>;
}

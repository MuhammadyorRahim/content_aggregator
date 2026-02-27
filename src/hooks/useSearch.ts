"use client";

import { useQuery } from "@tanstack/react-query";

import type { FeedPostItem, SearchResponse } from "@/types/feed";

async function fetchSearchResults(query: string) {
  const params = new URLSearchParams({ q: query, limit: "100" });
  const response = await fetch(`/api/search?${params.toString()}`, { cache: "no-store" });
  const payload = (await response.json()) as SearchResponse;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? "Failed to search posts");
  }

  return payload.data;
}

export function useSearch(query: string, options?: { enabled?: boolean }) {
  const normalized = query.trim();
  const enabled = (options?.enabled ?? true) && normalized.length > 0;

  const searchQuery = useQuery({
    queryKey: ["search", normalized],
    queryFn: () => fetchSearchResults(normalized),
    enabled,
    staleTime: 10_000,
  });

  return {
    ...searchQuery,
    results: (searchQuery.data ?? []) as FeedPostItem[],
  };
}

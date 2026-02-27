"use client";

import { useQuery } from "@tanstack/react-query";

import type { CategoriesResponse } from "@/types/feed";

const CATEGORIES_QUERY_KEY = ["categories"] as const;

async function fetchCategories() {
  const response = await fetch("/api/categories", { cache: "no-store" });
  const payload = (await response.json()) as CategoriesResponse;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? "Failed to load categories");
  }

  return payload.data;
}

export function useCategories(enabled = true) {
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: fetchCategories,
    staleTime: 30_000,
    enabled,
  });
}

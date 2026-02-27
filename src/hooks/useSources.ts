"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SourceSubscription, SourcesResponse } from "@/types/feed";

type MutationResponse = {
  success: boolean;
  data: unknown;
  error?: string;
};

type SubscribeInput = {
  type: "x" | "youtube" | "substack" | "telegram" | "website";
  url: string;
  name?: string;
};

type UpdateSubscriptionInput = {
  sourceId: string;
  customName?: string;
  mutedUntil?: string | null;
};

const SOURCES_QUERY_KEY = ["sources"] as const;

async function fetchSources() {
  const response = await fetch("/api/sources", { cache: "no-store" });
  const payload = (await response.json()) as SourcesResponse;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? "Failed to load sources");
  }

  return payload.data;
}

async function request(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const payload = (await response.json()) as MutationResponse;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? "Source request failed");
  }

  return payload.data;
}

function invalidateSourceRelated(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: SOURCES_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ["posts"] });
  queryClient.invalidateQueries({ queryKey: ["categories"] });
}

export function useSources(enabled = true) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: SOURCES_QUERY_KEY,
    queryFn: fetchSources,
    staleTime: 30_000,
    enabled,
  });

  const subscribe = useMutation({
    mutationFn: (input: SubscribeInput) => request("/api/sources", "POST", input),
    onSuccess: () => invalidateSourceRelated(queryClient),
  });

  const updateSubscription = useMutation({
    mutationFn: ({ sourceId, ...payload }: UpdateSubscriptionInput) =>
      request(`/api/sources/${encodeURIComponent(sourceId)}`, "PATCH", payload),
    onSuccess: () => invalidateSourceRelated(queryClient),
  });

  const unsubscribe = useMutation({
    mutationFn: (sourceId: string) => request(`/api/sources/${encodeURIComponent(sourceId)}`, "DELETE"),
    onSuccess: () => invalidateSourceRelated(queryClient),
  });

  return {
    ...query,
    sources: (query.data ?? []) as SourceSubscription[],
    subscribe,
    updateSubscription,
    unsubscribe,
  };
}

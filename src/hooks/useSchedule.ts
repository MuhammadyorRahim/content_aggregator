"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ScheduleEventItem, ScheduleResponse } from "@/types/feed";

type MutationResponse = {
  success: boolean;
  data: unknown;
  error?: string;
};

type CreateScheduleInput = {
  postId: string;
  title: string;
  scheduledAt: string;
};

type UpdateScheduleInput = {
  id: string;
  scheduledAt: string;
};

const SCHEDULE_QUERY_KEY = ["schedule"] as const;
const PRO_PLAN_ERROR = "PRO_PLAN_REQUIRED";

async function fetchSchedule() {
  const response = await fetch("/api/schedule", { cache: "no-store" });
  const payload = (await response.json()) as ScheduleResponse;

  if (response.status === 403) {
    throw new Error(PRO_PLAN_ERROR);
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? "Failed to load schedule");
  }

  return payload.data;
}

async function request(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const payload = (await response.json()) as MutationResponse;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? "Schedule request failed");
  }

  return payload.data;
}

export function useSchedule(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();
  const enabled = options?.enabled ?? true;

  const query = useQuery({
    queryKey: SCHEDULE_QUERY_KEY,
    queryFn: fetchSchedule,
    enabled,
    staleTime: 30_000,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message === PRO_PLAN_ERROR) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const createSchedule = useMutation({
    mutationFn: (input: CreateScheduleInput) => request("/api/schedule", "POST", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SCHEDULE_QUERY_KEY }),
  });

  const updateSchedule = useMutation({
    mutationFn: ({ id, scheduledAt }: UpdateScheduleInput) =>
      request(`/api/schedule/${encodeURIComponent(id)}`, "PATCH", { scheduledAt }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SCHEDULE_QUERY_KEY }),
  });

  const deleteSchedule = useMutation({
    mutationFn: (id: string) => request(`/api/schedule/${encodeURIComponent(id)}`, "DELETE"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SCHEDULE_QUERY_KEY }),
  });

  return {
    ...query,
    events: (query.data ?? []) as ScheduleEventItem[],
    isProRequired: query.error instanceof Error && query.error.message === PRO_PLAN_ERROR,
    createSchedule,
    updateSchedule,
    deleteSchedule,
  };
}

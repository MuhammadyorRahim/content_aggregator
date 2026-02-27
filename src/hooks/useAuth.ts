"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CurrentUserProfile, CurrentUserResponse } from "@/types/feed";

type AuthMutationResponse = {
  success: boolean;
  data: unknown;
  error?: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type RegisterInput = {
  email: string;
  password: string;
  name: string;
  inviteCode?: string;
};

const AUTH_QUERY_KEY = ["auth-me"] as const;

async function fetchCurrentUser() {
  const response = await fetch("/api/auth/me", { cache: "no-store" });
  const payload = (await response.json()) as CurrentUserResponse;

  if (response.status === 401) {
    return null;
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? "Failed to load current user");
  }

  return payload.data;
}

async function runAuthMutation(path: string, body?: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const payload = (await response.json()) as AuthMutationResponse;
  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? "Authentication request failed");
  }
}

export function useAuth() {
  const queryClient = useQueryClient();

  const userQuery = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchCurrentUser,
    staleTime: 30_000,
  });

  const loginMutation = useMutation({
    mutationFn: (input: LoginInput) => runAuthMutation("/api/auth/login", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (input: RegisterInput) => runAuthMutation("/api/auth/register", input),
  });

  const logoutMutation = useMutation({
    mutationFn: () => runAuthMutation("/api/auth/logout"),
    onSuccess: () => {
      queryClient.setQueryData<CurrentUserProfile | null>(AUTH_QUERY_KEY, null);
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    },
  });

  return {
    user: userQuery.data ?? null,
    isLoading: userQuery.isPending,
    isAuthenticated: Boolean(userQuery.data),
    error: userQuery.error as Error | null,
    refetch: userQuery.refetch,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    loginState: loginMutation,
    registerState: registerMutation,
    logoutState: logoutMutation,
  };
}

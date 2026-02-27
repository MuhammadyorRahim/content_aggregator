"use client";

import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import type { FeedFilters } from "@/components/layout/FilterBar";
import type { FeedPostItem, FeedPostsResponse } from "@/types/feed";

type UpdatePostStateInput = {
  postId: string;
  isRead?: boolean;
  isSaved?: boolean;
};

type BatchReadInput = {
  postIds: string[];
};

type MarkAllReadInput = {
  sourceId?: string;
};

type MutationResponse = {
  success: boolean;
  data: unknown;
  error?: string;
};

type PostsPage = {
  data: FeedPostItem[];
  meta: {
    page: number;
    totalPages: number;
    totalCount: number;
    hasMore: boolean;
  };
};

type UsePostsOptions = {
  enabled?: boolean;
};

const PAGE_SIZE = 20;

function buildPostsQueryParams(filters: Omit<FeedFilters, "query">, cursor?: string | null, limit = PAGE_SIZE) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));

  if (cursor) {
    params.set("cursor", cursor);
  }

  if (filters.category !== "all") {
    params.set("category", filters.category);
  }

  if (filters.sourceType !== "all") {
    params.set("sourceType", filters.sourceType);
  }

  if (filters.state === "unread") {
    params.set("isRead", "false");
  }

  if (filters.state === "saved") {
    params.set("isSaved", "true");
  }

  return params;
}

async function fetchPostsPage(filters: Omit<FeedFilters, "query">, cursor?: string | null, limit = PAGE_SIZE) {
  const query = buildPostsQueryParams(filters, cursor, limit);
  const response = await fetch(`/api/posts?${query.toString()}`, { cache: "no-store" });
  const payload = (await response.json()) as FeedPostsResponse;

  if (!response.ok || !payload.success || !payload.meta) {
    throw new Error(payload.error ?? "Failed to load posts");
  }

  return {
    data: payload.data,
    meta: payload.meta,
  } as PostsPage;
}

function patchPages(
  data: InfiniteData<PostsPage, string | null> | undefined,
  patcher: (post: FeedPostItem) => FeedPostItem | null
) {
  if (!data) {
    return data;
  }

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      data: page.data
        .map((post) => patcher(post))
        .filter((post): post is FeedPostItem => post !== null),
    })),
  };
}

function applyFilterToPatchedPost(filters: Omit<FeedFilters, "query">, post: FeedPostItem) {
  if (filters.state === "unread" && post.isRead) {
    return null;
  }

  if (filters.state === "saved" && !post.isSaved) {
    return null;
  }

  return post;
}

async function request(method: "PATCH" | "DELETE" | "POST", path: string, body?: unknown) {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const payload = (await response.json()) as MutationResponse;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? "Post mutation failed");
  }

  return payload.data;
}

export function usePosts(filters: Omit<FeedFilters, "query">, options?: UsePostsOptions) {
  const queryClient = useQueryClient();
  const enabled = options?.enabled ?? true;

  const postsQueryKey = useMemo(
    () => ["posts", filters.category, filters.sourceType, filters.state] as const,
    [filters.category, filters.sourceType, filters.state]
  );

  const postsQuery = useInfiniteQuery({
    queryKey: postsQueryKey,
    queryFn: ({ pageParam }) => fetchPostsPage(filters, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      if (!lastPage.meta.hasMore) {
        return undefined;
      }

      const lastItem = lastPage.data[lastPage.data.length - 1];
      return lastItem?.id;
    },
    enabled,
    staleTime: 15_000,
  });

  const posts = useMemo(
    () => postsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [postsQuery.data]
  );

  const firstPostId = posts[0]?.id;

  const newPostsQuery = useQuery({
    queryKey: ["posts-new-count", filters.category, filters.sourceType, filters.state, firstPostId ?? "none"],
    queryFn: async () => {
      if (!firstPostId) {
        return 0;
      }

      const latestPage = await fetchPostsPage(filters, null, 30);
      const index = latestPage.data.findIndex((post) => post.id === firstPostId);

      if (index < 0) {
        return latestPage.data.length;
      }

      return index;
    },
    enabled: enabled && Boolean(firstPostId),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const updatePostState = useMutation({
    mutationFn: ({ postId, ...payload }: UpdatePostStateInput) =>
      request("PATCH", `/api/posts/${encodeURIComponent(postId)}`, payload),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: postsQueryKey });
      const previous = queryClient.getQueryData<InfiniteData<PostsPage, string | null>>(postsQueryKey);

      queryClient.setQueryData<InfiniteData<PostsPage, string | null>>(postsQueryKey, (old) =>
        patchPages(old, (post) => {
          if (post.id !== variables.postId) {
            return post;
          }

          const nextPost = {
            ...post,
            ...(variables.isRead !== undefined ? { isRead: variables.isRead } : {}),
            ...(variables.isSaved !== undefined ? { isSaved: variables.isSaved } : {}),
          };

          return applyFilterToPatchedPost(filters, nextPost);
        })
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(postsQueryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: postsQueryKey });
      queryClient.invalidateQueries({ queryKey: ["search"] });
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const hidePost = useMutation({
    mutationFn: (postId: string) => request("DELETE", `/api/posts/${encodeURIComponent(postId)}`),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: postsQueryKey });
      const previous = queryClient.getQueryData<InfiniteData<PostsPage, string | null>>(postsQueryKey);

      queryClient.setQueryData<InfiniteData<PostsPage, string | null>>(postsQueryKey, (old) =>
        patchPages(old, (post) => (post.id === postId ? null : post))
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(postsQueryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: postsQueryKey });
      queryClient.invalidateQueries({ queryKey: ["search"] });
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const batchRead = useMutation({
    mutationFn: ({ postIds }: BatchReadInput) => request("POST", "/api/posts/batch-read", { postIds }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: postsQueryKey });
      const previous = queryClient.getQueryData<InfiniteData<PostsPage, string | null>>(postsQueryKey);
      const idSet = new Set(variables.postIds);

      queryClient.setQueryData<InfiniteData<PostsPage, string | null>>(postsQueryKey, (old) =>
        patchPages(old, (post) => {
          if (!idSet.has(post.id)) {
            return post;
          }

          const nextPost = { ...post, isRead: true };
          return applyFilterToPatchedPost(filters, nextPost);
        })
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(postsQueryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: postsQueryKey });
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: ({ sourceId }: MarkAllReadInput = {}) =>
      request("POST", `/api/posts/mark-all-read${sourceId ? `?sourceId=${encodeURIComponent(sourceId)}` : ""}`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: postsQueryKey });
      const previous = queryClient.getQueryData<InfiniteData<PostsPage, string | null>>(postsQueryKey);

      queryClient.setQueryData<InfiniteData<PostsPage, string | null>>(postsQueryKey, (old) =>
        patchPages(old, (post) => {
          const nextPost = { ...post, isRead: true };
          return applyFilterToPatchedPost(filters, nextPost);
        })
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(postsQueryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: postsQueryKey });
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
    },
  });

  const markPostRead = useCallback(
    (postId: string) => {
      const post = posts.find((item) => item.id === postId);
      if (!post || post.isRead) {
        return;
      }

      updatePostState.mutate({ postId, isRead: true });
    },
    [posts, updatePostState]
  );

  const toggleRead = useCallback(
    (post: FeedPostItem) => {
      updatePostState.mutate({
        postId: post.id,
        isRead: !post.isRead,
      });
    },
    [updatePostState]
  );

  const toggleSaved = useCallback(
    (post: FeedPostItem) => {
      updatePostState.mutate({
        postId: post.id,
        isSaved: !post.isSaved,
      });
    },
    [updatePostState]
  );

  const hide = useCallback(
    (post: FeedPostItem) => {
      hidePost.mutate(post.id);
    },
    [hidePost]
  );

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: postsQueryKey });
    queryClient.invalidateQueries({ queryKey: ["posts-new-count"] });
  }, [postsQueryKey, queryClient]);

  return {
    posts,
    pages: postsQuery.data?.pages ?? [],
    isLoading: postsQuery.isPending,
    isFetching: postsQuery.isFetching,
    isFetchingNextPage: postsQuery.isFetchingNextPage,
    isError: postsQuery.isError,
    error: postsQuery.error as Error | null,
    hasMore: postsQuery.hasNextPage ?? false,
    fetchNextPage: postsQuery.fetchNextPage,
    refetch: postsQuery.refetch,
    toggleRead,
    toggleSaved,
    hide,
    markPostRead,
    batchRead,
    markAllRead,
    updatePostState,
    hidePost,
    newPostsCount: newPostsQuery.data ?? 0,
    isCheckingNewPosts: newPostsQuery.isFetching,
    refreshLatest: refresh,
  };
}

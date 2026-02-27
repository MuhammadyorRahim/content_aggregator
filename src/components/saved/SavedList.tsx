"use client";

import { useEffect, useMemo, useState } from "react";

import { PostList } from "@/components/feed/PostList";
import { ReadingModal } from "@/components/feed/ReadingModal";
import { FilterBar, type FeedFilters } from "@/components/layout/FilterBar";
import { FeedListSkeleton } from "@/components/shared/LoadingStates";
import { Card, CardContent } from "@/components/ui/card";
import { useCategories, useErrorToast, usePosts, useReadTracker, useSearch } from "@/hooks";
import type { FeedPostItem } from "@/types/feed";

const initialFilters: Omit<FeedFilters, "state"> = {
  query: "",
  category: "all",
  sourceType: "all",
};

export function SavedList() {
  const [filters, setFilters] = useState(initialFilters);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [readingPost, setReadingPost] = useState<FeedPostItem | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(filters.query.trim()), 220);
    return () => clearTimeout(timer);
  }, [filters.query]);

  const activeFilters = useMemo(
    () => ({
      category: filters.category,
      sourceType: filters.sourceType,
      state: "saved" as const,
    }),
    [filters.category, filters.sourceType]
  );

  const searchMode = debouncedQuery.length > 0;
  const posts = usePosts(activeFilters, { enabled: !searchMode });
  const search = useSearch(debouncedQuery, { enabled: searchMode });
  const categoriesQuery = useCategories();

  const visiblePosts = useMemo(() => {
    if (!searchMode) {
      return posts.posts;
    }

    return search.results.filter((post) => {
      if (!post.isSaved) {
        return false;
      }

      if (filters.category !== "all" && post.category !== filters.category) {
        return false;
      }

      if (filters.sourceType !== "all" && post.source.type !== filters.sourceType) {
        return false;
      }

      return true;
    });
  }, [filters.category, filters.sourceType, posts.posts, search.results, searchMode]);

  const isLoading = searchMode ? search.isPending : posts.isLoading;
  const error = searchMode ? (search.error as Error | null) : posts.error;
  const hasMore = searchMode ? false : posts.hasMore;
  const isFetchingNextPage = searchMode ? false : posts.isFetchingNextPage;
  const emptyTitle = searchMode ? "No matching saved posts" : "No saved posts yet";
  const emptyDescription = searchMode
    ? "Try a different query or remove filters to broaden results."
    : "Bookmark posts from your feed and they will appear here.";

  const { getReadRef } = useReadTracker({
    onRead: posts.markPostRead,
    enabled: !searchMode,
  });

  useErrorToast(error, "Failed to load saved posts");

  return (
    <section className="space-y-4">
      <FilterBar
        value={{ ...filters, state: "saved" }}
        onChange={(next) =>
          setFilters({
            query: next.query,
            category: next.category,
            sourceType: next.sourceType,
          })
        }
        categories={categoriesQuery.data?.map((item) => item.category) ?? []}
      />

      {isLoading ? <FeedListSkeleton /> : null}

      {error ? (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">{error.message}</CardContent>
        </Card>
      ) : null}

      {!isLoading && !error ? (
        <PostList
          posts={visiblePosts}
          hasMore={hasMore}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={() => {
            if (!searchMode) {
              posts.fetchNextPage();
            }
          }}
          onToggleRead={posts.toggleRead}
          onToggleSaved={posts.toggleSaved}
          onHide={posts.hide}
          onOpenReader={setReadingPost}
          getReadRef={getReadRef}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
        />
      ) : null}

      <ReadingModal
        post={readingPost}
        open={Boolean(readingPost)}
        onOpenChange={(open) => {
          if (!open) {
            setReadingPost(null);
          }
        }}
        onToggleRead={posts.toggleRead}
        onToggleSaved={posts.toggleSaved}
      />
    </section>
  );
}

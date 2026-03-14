"use client";

import { useEffect, useMemo, useState } from "react";
import { RadioTower } from "lucide-react";

import { NewPostsBanner } from "@/components/feed/NewPostsBanner";
import { PostList } from "@/components/feed/PostList";
import { ReadingModal } from "@/components/feed/ReadingModal";
import { StatsCards } from "@/components/feed/StatsCards";
import { FilterBar, type FeedFilters } from "@/components/layout/FilterBar";
import { EmptyState } from "@/components/shared/EmptyState";
import { FeedListSkeleton, StatsCardsSkeleton } from "@/components/shared/LoadingStates";
import { Card, CardContent } from "@/components/ui/card";
import {
  useAuth,
  useCategories,
  useErrorToast,
  usePosts,
  useReadTracker,
  useSchedule,
  useSearch,
  useSources,
} from "@/hooks";
import type { FeedPostItem } from "@/types/feed";

const initialFilters: FeedFilters = {
  query: "",
  category: "all",
  sourceType: "all",
};

function applyLocalFilters(posts: FeedPostItem[], filters: Omit<FeedFilters, "query">) {
  return posts.filter((post) => {
    if (filters.category !== "all" && post.category !== filters.category) {
      return false;
    }

    if (filters.sourceType !== "all" && post.source.type !== filters.sourceType) {
      return false;
    }

    return true;
  });
}

export function FeedWorkspace() {
  const [filters, setFilters] = useState<FeedFilters>(initialFilters);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [readingPost, setReadingPost] = useState<FeedPostItem | null>(null);

  const { user } = useAuth();
  const sourcesQuery = useSources();
  const categoriesQuery = useCategories();
  const scheduleQuery = useSchedule({ enabled: user?.plan === "pro" });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(filters.query.trim()), 220);
    return () => clearTimeout(timer);
  }, [filters.query]);

  const activeFilters = useMemo(
    () => ({
      category: filters.category,
      sourceType: filters.sourceType,
    }),
    [filters.category, filters.sourceType]
  );

  const searchMode = debouncedQuery.length > 0;

  const posts = usePosts(activeFilters, { enabled: !searchMode });
  const search = useSearch(debouncedQuery, { enabled: searchMode });

  const displayedPosts = useMemo(() => {
    if (searchMode) {
      return applyLocalFilters(search.results, activeFilters);
    }

    return posts.posts;
  }, [activeFilters, posts.posts, search.results, searchMode]);

  const isLoading = searchMode ? search.isPending : posts.isLoading;
  const error = searchMode ? (search.error as Error | null) : posts.error;
  const hasMore = searchMode ? false : posts.hasMore;
  const isFetchingNextPage = searchMode ? false : posts.isFetchingNextPage;
  const statsLoading =
    sourcesQuery.isPending || categoriesQuery.isPending || (user?.plan === "pro" && scheduleQuery.isPending);

  const { getReadRef } = useReadTracker({
    enabled: !searchMode,
    onRead: (postId) => posts.markPostRead(postId),
  });

  useErrorToast(error, "Failed to load feed");
  useErrorToast(sourcesQuery.error, "Failed to load sources");
  useErrorToast(categoriesQuery.error, "Failed to load categories");

  const unreadTotal = sourcesQuery.sources.reduce((sum, source) => sum + source.unreadCount, 0);
  const categoryCount = categoriesQuery.data?.length ?? 0;
  const showOnboarding =
    !searchMode &&
    !isLoading &&
    !error &&
    !sourcesQuery.isPending &&
    !sourcesQuery.isError &&
    sourcesQuery.sources.length === 0;

  return (
    <section className="space-y-4">
      <FilterBar
        value={filters}
        onChange={setFilters}
        categories={categoriesQuery.data?.map((category) => category.category) ?? []}
      />

      {statsLoading ? (
        <StatsCardsSkeleton />
      ) : (
        <StatsCards
          sourcesCount={sourcesQuery.sources.length}
          unreadCount={unreadTotal}
          categoryCount={categoryCount}
          scheduledCount={user?.plan === "pro" ? scheduleQuery.events.length : null}
          isPro={user?.plan === "pro"}
        />
      )}

      {!searchMode ? (
        <NewPostsBanner count={posts.newPostsCount} refreshing={posts.isCheckingNewPosts} onRefresh={posts.refreshLatest} />
      ) : null}

      {isLoading ? <FeedListSkeleton /> : null}

      {error ? (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">{error.message}</CardContent>
        </Card>
      ) : null}

      {showOnboarding ? (
        <EmptyState
          icon={RadioTower}
          title="Welcome to your feed"
          description="Add your first source to start building a personal content stream."
          action={{ label: "Add your first source", href: "/sources" }}
        />
      ) : null}

      {!isLoading && !error && !showOnboarding ? (
        <PostList
          posts={displayedPosts}
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

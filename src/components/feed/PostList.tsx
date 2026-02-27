"use client";

import { Loader2, NotebookPen } from "lucide-react";
import { useEffect, useRef } from "react";

import { ArticleCard } from "@/components/feed/cards/ArticleCard";
import { TelegramCard } from "@/components/feed/cards/TelegramCard";
import { TweetCard } from "@/components/feed/cards/TweetCard";
import { YoutubeCard } from "@/components/feed/cards/YoutubeCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import type { FeedPostItem } from "@/types/feed";

type EmptyAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

type PostListProps = {
  posts: FeedPostItem[];
  hasMore: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onToggleRead: (post: FeedPostItem) => void;
  onToggleSaved: (post: FeedPostItem) => void;
  onHide: (post: FeedPostItem) => void;
  onOpenReader: (post: FeedPostItem) => void;
  getReadRef: (postId: string, isRead: boolean) => (node: HTMLElement | null) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: EmptyAction;
};

function renderCard(props: Omit<PostListProps, "posts" | "hasMore" | "isFetchingNextPage" | "onLoadMore" | "getReadRef"> & {
  post: FeedPostItem;
}) {
  const { post, ...actions } = props;

  if (post.source.type === "x") {
    return <TweetCard post={post} {...actions} />;
  }

  if (post.source.type === "youtube") {
    return <YoutubeCard post={post} {...actions} />;
  }

  if (post.source.type === "telegram") {
    return <TelegramCard post={post} {...actions} />;
  }

  return <ArticleCard post={post} {...actions} />;
}

export function PostList({
  posts,
  hasMore,
  isFetchingNextPage,
  onLoadMore,
  onToggleRead,
  onToggleSaved,
  onHide,
  onOpenReader,
  getReadRef,
  emptyTitle = "No posts yet",
  emptyDescription = "Subscribe to sources or relax filters to populate your feed.",
  emptyAction,
}: PostListProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore || isFetchingNextPage || !sentinelRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: "320px 0px 320px 0px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, isFetchingNextPage, onLoadMore, posts.length]);

  if (!posts.length) {
    return (
      <EmptyState
        icon={NotebookPen}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <article key={post.id} ref={getReadRef(post.id, post.isRead)}>
          {renderCard({
            post,
            onToggleRead,
            onToggleSaved,
            onHide,
            onOpenReader,
          })}
        </article>
      ))}

      <div ref={sentinelRef} className="h-8" />

      {isFetchingNextPage ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading more posts...
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

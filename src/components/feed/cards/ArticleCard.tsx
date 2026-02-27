"use client";

import { ExternalLink, FileText } from "lucide-react";
import Image from "next/image";

import { PostActions } from "@/components/feed/PostActions";
import { shortExcerpt } from "@/components/feed/cards/card-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FeedPostItem } from "@/types/feed";

type ArticleCardProps = {
  post: FeedPostItem;
  busy?: boolean;
  onToggleRead: (post: FeedPostItem) => void;
  onToggleSaved: (post: FeedPostItem) => void;
  onHide: (post: FeedPostItem) => void;
  onOpenReader: (post: FeedPostItem) => void;
};

export function ArticleCard({ post, busy, onToggleRead, onToggleSaved, onHide, onOpenReader }: ArticleCardProps) {
  const sourceName = post.sourceCustomName || post.source.name;

  return (
    <Card className="overflow-hidden border-border/70 bg-card/70">
      {post.imageUrl ? (
        <div className="max-h-64 overflow-hidden border-b border-border/60">
          <Image
            src={post.imageUrl}
            alt={post.title || "Article image"}
            width={1200}
            height={630}
            unoptimized
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={post.isRead ? "secondary" : "default"}>{post.isRead ? "Read" : "Unread"}</Badge>
            {post.isSaved ? <Badge variant="outline">Saved</Badge> : null}
            <Badge variant="outline">{post.source.type}</Badge>
            {post.category ? <Badge variant="outline">{post.category}</Badge> : null}
          </div>
          <CardTitle className="text-base">{post.title || "Untitled article"}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {sourceName} · {new Date(post.publishedAt).toLocaleString()}
          </p>
        </div>
        <PostActions
          isRead={post.isRead}
          isSaved={post.isSaved}
          busy={busy}
          onToggleRead={() => onToggleRead(post)}
          onToggleSaved={() => onToggleSaved(post)}
          onHide={() => onHide(post)}
          onOpenReader={() => onOpenReader(post)}
        />
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{shortExcerpt(post.content, 320)}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => onOpenReader(post)}>
            <FileText className="size-4" />
            Open reader
          </Button>
          {post.url ? (
            <Button asChild size="sm" variant="ghost">
              <a href={post.url} target="_blank" rel="noreferrer">
                Original link
                <ExternalLink className="size-4" />
              </a>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

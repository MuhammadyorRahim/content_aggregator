"use client";

import { ExternalLink, PlayCircle } from "lucide-react";

import { PostActions } from "@/components/feed/PostActions";
import { getYouTubeVideoId, shortExcerpt } from "@/components/feed/cards/card-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FeedPostItem } from "@/types/feed";

type YoutubeCardProps = {
  post: FeedPostItem;
  busy?: boolean;
  onToggleRead: (post: FeedPostItem) => void;
  onToggleSaved: (post: FeedPostItem) => void;
  onHide: (post: FeedPostItem) => void;
  onOpenReader: (post: FeedPostItem) => void;
};

export function YoutubeCard({ post, busy, onToggleRead, onToggleSaved, onHide, onOpenReader }: YoutubeCardProps) {
  const videoId = getYouTubeVideoId(post);
  const sourceName = post.sourceCustomName || post.source.name;

  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={post.isRead ? "secondary" : "default"}>{post.isRead ? "Read" : "Unread"}</Badge>
            {post.isSaved ? <Badge variant="outline">Saved</Badge> : null}
            <Badge variant="outline">YouTube</Badge>
          </div>
          <CardTitle className="text-base">{post.title || "Untitled video"}</CardTitle>
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
      <CardContent className="space-y-4">
        {videoId ? (
          <div className="overflow-hidden rounded-lg border border-border/60 bg-black">
            <iframe
              title={post.title || "YouTube video"}
              src={`https://www.youtube.com/embed/${videoId}`}
              className="aspect-video w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
            <PlayCircle className="mr-2 size-5" />
            Video preview unavailable
          </div>
        )}

        <p className="text-sm text-muted-foreground">{shortExcerpt(post.content, 260)}</p>

        {post.url ? (
          <Button asChild size="sm" variant="outline">
            <a href={post.url} target="_blank" rel="noreferrer">
              Open on YouTube
              <ExternalLink className="size-4" />
            </a>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

"use client";

import { ExternalLink, MessageCircle } from "lucide-react";

import { PostActions } from "@/components/feed/PostActions";
import { shortExcerpt } from "@/components/feed/cards/card-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FeedPostItem } from "@/types/feed";

type TelegramCardProps = {
  post: FeedPostItem;
  busy?: boolean;
  onToggleRead: (post: FeedPostItem) => void;
  onToggleSaved: (post: FeedPostItem) => void;
  onHide: (post: FeedPostItem) => void;
  onOpenReader: (post: FeedPostItem) => void;
};

export function TelegramCard({ post, busy, onToggleRead, onToggleSaved, onHide, onOpenReader }: TelegramCardProps) {
  const sourceName = post.sourceCustomName || post.source.name;

  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={post.isRead ? "secondary" : "default"}>{post.isRead ? "Read" : "Unread"}</Badge>
            {post.isSaved ? <Badge variant="outline">Saved</Badge> : null}
            <Badge variant="outline">Telegram</Badge>
          </div>
          <CardTitle className="text-base">{post.title || sourceName}</CardTitle>
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
        <div className="rounded-lg bg-muted/60 p-4 text-sm leading-relaxed">
          <p>{shortExcerpt(post.content, 320)}</p>
        </div>
        {post.url ? (
          <Button asChild size="sm" variant="outline">
            <a href={post.url} target="_blank" rel="noreferrer">
              <MessageCircle className="size-4" />
              Open in Telegram
              <ExternalLink className="size-4" />
            </a>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

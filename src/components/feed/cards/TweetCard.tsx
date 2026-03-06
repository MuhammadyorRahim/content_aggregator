"use client";

import { useState } from "react";
import { ExternalLink, User } from "lucide-react";
import Image from "next/image";

import { PostActions } from "@/components/feed/PostActions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  extractHandleFromUrl,
  formatRelativeDate,
  parseTweetContent,
  truncateUrlsInText,
} from "@/components/feed/cards/card-utils";
import type { FeedPostItem } from "@/types/feed";

type TweetCardProps = {
  post: FeedPostItem;
  busy?: boolean;
  onToggleRead: (post: FeedPostItem) => void;
  onToggleSaved: (post: FeedPostItem) => void;
  onHide: (post: FeedPostItem) => void;
  onOpenReader: (post: FeedPostItem) => void;
};

export function TweetCard({ post, busy, onToggleRead, onToggleSaved, onHide, onOpenReader }: TweetCardProps) {
  const sourceName = post.sourceCustomName || post.source.name;
  const handle = post.url ? extractHandleFromUrl(post.url) : null;
  const { mainText, quote } = parseTweetContent(post.content);
  const displayText = truncateUrlsInText(mainText);
  const [avatarError, setAvatarError] = useState(false);

  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={post.isRead ? "secondary" : "default"}>{post.isRead ? "Read" : "Unread"}</Badge>
          {post.isSaved ? <Badge variant="outline">Saved</Badge> : null}
          <Badge variant="outline">X</Badge>
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

      <CardContent className="space-y-3 pt-0">
        {/* Author row */}
        <div className="flex items-center gap-3">
          <div className="size-10 shrink-0 overflow-hidden rounded-full bg-muted">
            {handle && !avatarError ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={`https://unavatar.io/x/${handle}`}
                alt={`@${handle}`}
                className="size-full object-cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <User className="size-5" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-semibold text-foreground text-sm">
                {post.author || sourceName}
              </span>
              {handle ? (
                <span className="shrink-0 text-xs text-muted-foreground">@{handle}</span>
              ) : null}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{sourceName}</span>
              <span>·</span>
              {post.url ? (
                <a
                  href={post.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  {formatRelativeDate(post.publishedAt)}
                </a>
              ) : (
                <span>{formatRelativeDate(post.publishedAt)}</span>
              )}
              {post.url ? <ExternalLink className="size-3 shrink-0 opacity-60" /> : null}
            </div>
          </div>
        </div>

        {/* Main tweet text */}
        {displayText ? (
          <p className="whitespace-pre-line text-sm leading-relaxed">{displayText}</p>
        ) : null}

        {/* Tweet media image */}
        {post.imageUrl ? (
          <div className="overflow-hidden rounded-xl border border-border/60">
            <Image
              src={post.imageUrl}
              alt="Tweet media"
              width={1200}
              height={675}
              unoptimized
              className="h-auto w-full object-cover"
            />
          </div>
        ) : null}

        {/* Quoted tweet */}
        {quote ? (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
            {quote.authorHandle ? (
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                @{quote.authorHandle}
              </p>
            ) : null}
            {quote.text ? (
              <p className="text-sm leading-relaxed text-foreground/90">
                {truncateUrlsInText(quote.text)}
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

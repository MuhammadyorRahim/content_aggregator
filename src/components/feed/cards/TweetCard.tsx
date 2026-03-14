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
import type { ParsedTweetQuote } from "@/components/feed/cards/card-utils";
import type { FeedPostItem } from "@/types/feed";

type TweetCardProps = {
  post: FeedPostItem;
  busy?: boolean;
  onToggleSaved: (post: FeedPostItem) => void;
  onHide: (post: FeedPostItem) => void;
  onOpenReader: (post: FeedPostItem) => void;
};

function QuoteEmbed({ quote }: { quote: ParsedTweetQuote }) {
  const [quoteAvatarError, setQuoteAvatarError] = useState(false);
  const quoteUrl = quote.authorHandle
    ? `https://x.com/${quote.authorHandle.replace(/^@/, "")}`
    : undefined;
  const cleanHandle = quote.authorHandle.replace(/^@/, "");

  return (
    <a
      href={quoteUrl}
      target="_blank"
      rel="noreferrer"
      className="block rounded-xl border border-border/50 bg-muted/20 p-3 transition-colors hover:border-border/80 hover:bg-muted/40"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Quote author header */}
      <div className="mb-2 flex items-center gap-2">
        <div className="size-5 shrink-0 overflow-hidden rounded-full bg-muted">
          {cleanHandle && !quoteAvatarError ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={`https://unavatar.io/x/${cleanHandle}`}
              alt={`@${cleanHandle}`}
              className="size-full object-cover"
              onError={() => setQuoteAvatarError(true)}
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <User className="size-3" />
            </div>
          )}
        </div>
        {cleanHandle ? (
          <span className="text-xs font-semibold text-foreground">@{cleanHandle}</span>
        ) : null}
        <XIcon className="ml-auto size-3 shrink-0 text-muted-foreground" />
      </div>

      {/* Quote text */}
      {quote.text ? (
        <p className="text-[0.8rem] leading-relaxed text-foreground/85">
          {truncateUrlsInText(quote.text)}
        </p>
      ) : null}

      {/* Quote image */}
      {quote.imageUrl ? (
        <div className="mt-2 overflow-hidden rounded-lg border border-border/40">
          <Image
            src={quote.imageUrl}
            alt="Quoted tweet media"
            width={600}
            height={340}
            unoptimized
            className="h-auto max-h-36 w-full object-cover"
          />
        </div>
      ) : null}
    </a>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function TweetCard({ post, busy, onToggleSaved, onHide, onOpenReader }: TweetCardProps) {
  const sourceName = post.sourceCustomName || post.source.name;
  const handle = post.url ? extractHandleFromUrl(post.url) : null;
  const { mainText, quote } = parseTweetContent(post.content);
  const displayText = truncateUrlsInText(mainText);
  const [avatarError, setAvatarError] = useState(false);

  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader className="flex-row items-center justify-end gap-2 space-y-0 pb-2">
        {post.isSaved ? <Badge variant="outline">Saved</Badge> : null}
        <Badge variant="outline">X</Badge>
        <PostActions
          isSaved={post.isSaved}
          busy={busy}
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

        {/* Quoted tweet embed */}
        {quote ? <QuoteEmbed quote={quote} /> : null}
      </CardContent>
    </Card>
  );
}

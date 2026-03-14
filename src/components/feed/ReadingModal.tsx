"use client";

import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FeedPostItem } from "@/types/feed";

type ReadingModalProps = {
  post: FeedPostItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleSaved: (post: FeedPostItem) => void;
};

export function ReadingModal({ post, open, onOpenChange, onToggleSaved }: ReadingModalProps) {
  if (!post) {
    return null;
  }

  const sourceName = post.sourceCustomName || post.source.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{post.title || "Untitled post"}</DialogTitle>
          <DialogDescription>
            {sourceName} · {new Date(post.publishedAt).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <article
          className="text-sm leading-relaxed text-foreground [&_a]:text-primary [&_a]:underline [&_img]:my-3 [&_img]:max-h-80 [&_img]:rounded-lg [&_img]:object-cover [&_img]:shadow-sm [&_p]:mb-3"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <DialogFooter className="justify-between">
          <Button variant="outline" onClick={() => onToggleSaved(post)}>
            {post.isSaved ? "Unsave" : "Save"}
          </Button>

          {post.url ? (
            <Button asChild>
              <a href={post.url} target="_blank" rel="noreferrer">
                Open original
                <ExternalLink className="size-4" />
              </a>
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

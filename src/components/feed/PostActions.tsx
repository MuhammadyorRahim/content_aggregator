"use client";

import { Bookmark, BookmarkCheck, BookOpen, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type PostActionsProps = {
  isSaved: boolean;
  busy?: boolean;
  onToggleSaved: () => void;
  onOpenReader: () => void;
  onHide: () => void;
};

export function PostActions({
  isSaved,
  busy = false,
  onToggleSaved,
  onOpenReader,
  onHide,
}: PostActionsProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-xs" disabled={busy} onClick={onOpenReader} aria-label="Open reader">
              <BookOpen className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open reader</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-xs" disabled={busy} onClick={onToggleSaved} aria-label={isSaved ? "Remove from saved" : "Save post"}>
              {isSaved ? <BookmarkCheck className="size-4 text-primary" /> : <Bookmark className="size-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isSaved ? "Remove from saved" : "Save post"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-xs" disabled={busy} onClick={onHide} aria-label="Hide post" className="hover:text-destructive">
              <Trash2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Hide post</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

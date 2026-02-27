"use client";

import { Bookmark, BookOpen, Eye, EyeOff, MoreHorizontal, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type PostActionsProps = {
  isRead: boolean;
  isSaved: boolean;
  busy?: boolean;
  onToggleRead: () => void;
  onToggleSaved: () => void;
  onOpenReader: () => void;
  onHide: () => void;
};

export function PostActions({
  isRead,
  isSaved,
  busy = false,
  onToggleRead,
  onToggleSaved,
  onOpenReader,
  onHide,
}: PostActionsProps) {
  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-xs" disabled={busy} aria-label="Post actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Post actions</TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onOpenReader}>
            <BookOpen className="size-4" />
            Open reader
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onToggleRead}>
            {isRead ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {isRead ? "Mark unread" : "Mark read"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onToggleSaved}>
            <Bookmark className="size-4" />
            {isSaved ? "Remove from saved" : "Save post"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onHide} variant="destructive">
            <Trash2 className="size-4" />
            Hide post
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}

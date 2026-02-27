"use client";

import { ArrowUpCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

type NewPostsBannerProps = {
  count: number;
  refreshing?: boolean;
  onRefresh: () => void;
};

export function NewPostsBanner({ count, refreshing = false, onRefresh }: NewPostsBannerProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <div className="sticky top-20 z-10 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-primary">
          <ArrowUpCircle className="size-4" />
          {count} new {count === 1 ? "post" : "posts"} available
        </div>
        <Button size="sm" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          Show latest
        </Button>
      </div>
    </div>
  );
}

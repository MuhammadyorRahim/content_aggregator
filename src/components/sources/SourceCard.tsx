"use client";

import { Edit, MoreHorizontal, Trash2, VolumeX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SourceSubscription } from "@/types/feed";

type SourceCardProps = {
  subscription: SourceSubscription;
  busy?: boolean;
  onEdit: (subscription: SourceSubscription) => void;
  onMute: (subscription: SourceSubscription) => void;
  onUnsubscribe: (subscription: SourceSubscription) => void;
};

function statusVariant(status: string) {
  if (status === "success") {
    return "default" as const;
  }
  if (status === "failed") {
    return "destructive" as const;
  }
  return "secondary" as const;
}

export function SourceCard({ subscription, busy, onEdit, onMute, onUnsubscribe }: SourceCardProps) {
  const mutedUntil = subscription.mutedUntil ? new Date(subscription.mutedUntil) : null;
  const isMuted = Boolean(mutedUntil && mutedUntil > new Date());

  return (
    <Card className="border-border/70">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-2">
          <CardTitle className="text-base">{subscription.customName || subscription.source.name}</CardTitle>
          <p className="break-all text-xs text-muted-foreground">{subscription.source.url}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{subscription.source.type}</Badge>
            <Badge variant={statusVariant(subscription.source.lastFetchStatus)}>
              {subscription.source.lastFetchStatus}
            </Badge>
            <Badge variant={subscription.unreadCount > 0 ? "default" : "secondary"}>
              {subscription.unreadCount} unread
            </Badge>
            {isMuted ? <Badge variant="secondary">Muted until {mutedUntil?.toLocaleString()}</Badge> : null}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-xs" variant="outline" disabled={busy}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(subscription)}>
              <Edit className="size-4" />
              Edit name
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMute(subscription)}>
              <VolumeX className="size-4" />
              {isMuted ? "Adjust mute" : "Mute source"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onUnsubscribe(subscription)}>
              <Trash2 className="size-4" />
              Unsubscribe
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        Added {new Date(subscription.createdAt).toLocaleDateString()} · Last fetch{" "}
        {subscription.source.lastFetchedAt ? new Date(subscription.source.lastFetchedAt).toLocaleString() : "never"}
      </CardContent>
    </Card>
  );
}

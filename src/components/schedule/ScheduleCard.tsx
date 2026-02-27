"use client";

import { CalendarClock, ExternalLink, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScheduleEventItem } from "@/types/feed";

type ScheduleCardProps = {
  event: ScheduleEventItem;
  busy?: boolean;
  onEdit: (event: ScheduleEventItem) => void;
  onDelete: (event: ScheduleEventItem) => void;
};

export function ScheduleCard({ event, busy = false, onEdit, onDelete }: ScheduleCardProps) {
  const scheduledDate = new Date(event.scheduledAt);
  const isOverdue = scheduledDate < new Date();

  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isOverdue ? "destructive" : "default"}>
              {isOverdue ? "Overdue" : "Upcoming"}
            </Badge>
            <Badge variant="outline">{event.post.source.type}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button size="icon-xs" variant="outline" onClick={() => onEdit(event)} disabled={busy}>
              <Pencil className="size-4" />
            </Button>
            <Button size="icon-xs" variant="outline" onClick={() => onDelete(event)} disabled={busy}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
        <CardTitle className="text-base">{event.title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarClock className="size-4" />
          {scheduledDate.toLocaleString()}
        </div>

        <div className="rounded-lg border border-border/70 p-3 text-sm">
          <p className="font-medium">{event.post.title || "Untitled post"}</p>
          <p className="text-muted-foreground">{event.post.source.name}</p>
        </div>

        {event.post.url ? (
          <Button asChild size="sm" variant="outline">
            <a href={event.post.url} target="_blank" rel="noreferrer">
              Open post
              <ExternalLink className="size-4" />
            </a>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

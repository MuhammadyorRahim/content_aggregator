"use client";

import { FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ScheduleEventItem } from "@/types/feed";

type CreateScheduleInput = {
  postId: string;
  title: string;
  scheduledAt: string;
};

type UpdateScheduleInput = {
  id: string;
  scheduledAt: string;
};

type ScheduleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: ScheduleEventItem | null;
  loading?: boolean;
  onCreate: (input: CreateScheduleInput) => Promise<void> | void;
  onUpdate: (input: UpdateScheduleInput) => Promise<void> | void;
};

function toLocalDateTimeInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetMs = date.getTime() - date.getTimezoneOffset() * 60_000;
  return new Date(offsetMs).toISOString().slice(0, 16);
}

function defaultDateTimeInput() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  const offsetMs = date.getTime() - date.getTimezoneOffset() * 60_000;
  return new Date(offsetMs).toISOString().slice(0, 16);
}

export function ScheduleDialog({
  open,
  onOpenChange,
  event,
  loading = false,
  onCreate,
  onUpdate,
}: ScheduleDialogProps) {
  const isEditMode = Boolean(event);
  const initialScheduledAt = event ? toLocalDateTimeInput(event.scheduledAt) : defaultDateTimeInput();

  async function handleSubmit(eventInput: FormEvent) {
    eventInput.preventDefault();

    const form = eventInput.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const scheduledAt = String(formData.get("scheduledAt") ?? "").trim();

    if (!scheduledAt) {
      return;
    }

    const isoValue = new Date(scheduledAt).toISOString();

    if (isEditMode && event) {
      try {
        await onUpdate({
          id: event.id,
          scheduledAt: isoValue,
        });
        onOpenChange(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update event");
      }
      return;
    }

    try {
      const postId = String(formData.get("postId") ?? "").trim();
      const title = String(formData.get("title") ?? "").trim();

      await onCreate({
        postId,
        title,
        scheduledAt: isoValue,
      });
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create event");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Reschedule event" : "Create schedule event"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Move this event to a new date/time."
              : "Create an event using a post ID from your feed and choose a reminder time."}
          </DialogDescription>
        </DialogHeader>

        <form key={`${event?.id ?? "new"}-${open ? "open" : "closed"}`} onSubmit={handleSubmit} className="space-y-4">
          {!isEditMode ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="postId">Post ID</Label>
                <Input id="postId" name="postId" placeholder="cuid from a feed post" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Event title</Label>
                <Input id="title" name="title" placeholder="Review this article" required />
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-border/70 p-3 text-sm">
              <p className="font-medium">{event?.title}</p>
              <p className="text-muted-foreground">
                Post: {event?.post.title || event?.post.id} - {event?.post.source.name}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="scheduledAt">Schedule time</Label>
            <Input id="scheduledAt" name="scheduledAt" type="datetime-local" defaultValue={initialScheduledAt} required />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEditMode ? "Save changes" : "Create event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { FormEvent, useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { SourceSubscription } from "@/types/feed";

type MuteSourceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: SourceSubscription | null;
  loading?: boolean;
  onSubmit: (input: { sourceId: string; mutedUntil: string | null }) => Promise<void> | void;
};

type DurationOption = "none" | "1h" | "8h" | "24h" | "7d";

function toMutedUntil(duration: DurationOption) {
  if (duration === "none") {
    return null;
  }

  const now = Date.now();
  const offsetMs =
    duration === "1h"
      ? 60 * 60 * 1000
      : duration === "8h"
        ? 8 * 60 * 60 * 1000
        : duration === "24h"
          ? 24 * 60 * 60 * 1000
          : 7 * 24 * 60 * 60 * 1000;

  return new Date(now + offsetMs).toISOString();
}

export function MuteSourceDialog({
  open,
  onOpenChange,
  subscription,
  loading = false,
  onSubmit,
}: MuteSourceDialogProps) {
  const defaultDuration = useMemo<DurationOption>(() => {
    if (!subscription?.mutedUntil) {
      return "none";
    }

    const mutedUntil = new Date(subscription.mutedUntil);
    if (mutedUntil <= new Date()) {
      return "none";
    }

    return "24h";
  }, [subscription]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!subscription) {
      return;
    }

    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const duration = (String(formData.get("duration") ?? "none") as DurationOption) || "none";

    await onSubmit({
      sourceId: subscription.sourceId,
      mutedUntil: toMutedUntil(duration),
    });

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mute source</DialogTitle>
          <DialogDescription>
            Temporarily hide posts from {subscription?.customName || subscription?.source.name || "this source"}.
          </DialogDescription>
        </DialogHeader>

        <form key={`${subscription?.id ?? "none"}-${defaultDuration}`} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="duration">Mute duration</Label>
            <select
              id="duration"
              name="duration"
              defaultValue={defaultDuration}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="none">Do not mute</option>
              <option value="1h">1 hour</option>
              <option value="8h">8 hours</option>
              <option value="24h">24 hours</option>
              <option value="7d">7 days</option>
            </select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading || !subscription}>
              {loading ? "Saving..." : "Apply"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

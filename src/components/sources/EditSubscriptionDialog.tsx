"use client";

import { FormEvent } from "react";

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
import type { SourceSubscription } from "@/types/feed";

type EditSubscriptionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: SourceSubscription | null;
  loading?: boolean;
  onSubmit: (input: { sourceId: string; customName?: string }) => Promise<void> | void;
};

export function EditSubscriptionDialog({
  open,
  onOpenChange,
  subscription,
  loading = false,
  onSubmit,
}: EditSubscriptionDialogProps) {
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!subscription) {
      return;
    }

    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const customName = String(formData.get("customName") ?? "").trim();

    await onSubmit({
      sourceId: subscription.sourceId,
      customName: customName || undefined,
    });

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit subscription name</DialogTitle>
          <DialogDescription>Customize how this source appears in your feed.</DialogDescription>
        </DialogHeader>

        <form
          key={`${subscription?.id ?? "none"}-${subscription?.customName ?? ""}`}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="customName">Custom name</Label>
            <Input
              id="customName"
              name="customName"
              defaultValue={subscription?.customName || ""}
              placeholder={subscription?.source.name || "Source name"}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading || !subscription}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

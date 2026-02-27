"use client";

import { PlusCircle } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SOURCE_TYPES } from "@/lib/constants";
import { normalizeSourceUrl } from "@/lib/url-normalizer";

type SourceType = (typeof SOURCE_TYPES)[number];

type AddSourceDialogProps = {
  onSubmit: (input: { type: SourceType; url: string; name?: string }) => Promise<void> | void;
  loading?: boolean;
};

export function AddSourceDialog({ onSubmit, loading = false }: AddSourceDialogProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<SourceType>("x");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");

  const normalizedPreview = useMemo(() => {
    if (!url.trim()) {
      return null;
    }

    try {
      return normalizeSourceUrl(type, url);
    } catch {
      return "invalid";
    }
  }, [type, url]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!url.trim()) {
      toast.error("Source URL/handle is required");
      return;
    }

    try {
      normalizeSourceUrl(type, url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid source URL/handle");
      return;
    }

    try {
      await onSubmit({
        type,
        url: url.trim(),
        name: name.trim() || undefined,
      });

      setUrl("");
      setName("");
      setType("x");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to subscribe source");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="size-4" />
          Add source
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subscribe to source</DialogTitle>
          <DialogDescription>
            Add X, YouTube, Substack, Telegram, or website sources. URLs are normalized for deduplication.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sourceType">Source type</Label>
            <Select value={type} onValueChange={(next) => setType(next as SourceType)}>
              <SelectTrigger id="sourceType" className="w-full">
                <SelectValue placeholder="Choose source type" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_TYPES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sourceUrl">URL or handle</Label>
            <Input
              id="sourceUrl"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="e.g. x.com/karpathy, @veritasium, t.me/channel"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sourceName">Custom name (optional)</Label>
            <Input
              id="sourceName"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="My favorite source"
            />
          </div>

          {normalizedPreview ? (
            <p className="text-xs text-muted-foreground">
              Normalized:{" "}
              <span className={normalizedPreview === "invalid" ? "text-destructive" : "text-foreground"}>
                {normalizedPreview === "invalid" ? "invalid source" : normalizedPreview}
              </span>
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Subscribing..." : "Subscribe"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

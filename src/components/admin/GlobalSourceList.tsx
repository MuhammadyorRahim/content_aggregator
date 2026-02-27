"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, RefreshCw, Search } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/LoadingStates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useErrorToast } from "@/hooks";
import type { AdminSource, AdminSourcesResponse } from "@/types/admin";

type MutationResponse = {
  success: boolean;
  data: unknown;
  error?: string;
};

async function fetchSources() {
  const response = await fetch("/api/admin/sources", { cache: "no-store" });
  const payload = (await response.json()) as AdminSourcesResponse;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? "Failed to load sources");
  }

  return payload.data;
}

async function patchSource(sourceId: string, input: { url?: string; name?: string; enabled: boolean }) {
  const response = await fetch(`/api/admin/sources/${encodeURIComponent(sourceId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as MutationResponse;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? "Failed to update source");
  }
}

async function forceFetch(sourceId: string) {
  const response = await fetch(`/api/admin/sources/${encodeURIComponent(sourceId)}/fetch`, {
    method: "POST",
  });
  const payload = (await response.json()) as MutationResponse & {
    data?: { fetchedCount?: number; insertedCount?: number };
  };

  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? "Failed to fetch source");
  }

  return payload.data;
}

type EditDialogProps = {
  source: AdminSource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  onSubmit: (sourceId: string, input: { url?: string; name?: string; enabled: boolean }) => Promise<void> | void;
};

function EditSourceDialog({ source, open, onOpenChange, loading = false, onSubmit }: EditDialogProps) {
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!source) {
      return;
    }

    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    const name = String(formData.get("name") ?? "").trim();
    const url = String(formData.get("url") ?? "").trim();
    const enabledRaw = String(formData.get("enabled") ?? (source.enabled ? "true" : "false"));

    try {
      await onSubmit(source.id, {
        name: name || undefined,
        url: url || undefined,
        enabled: enabledRaw === "true",
      });

      onOpenChange(false);
    } catch {
      // Mutation-level toast already handles error visibility.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit source</DialogTitle>
          <DialogDescription>Update URL, display name, and enable state for this global source.</DialogDescription>
        </DialogHeader>

        <form key={source?.id ?? "none"} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sourceName">Name</Label>
            <Input id="sourceName" name="name" defaultValue={source?.name || ""} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sourceUrl">URL</Label>
            <Input id="sourceUrl" name="url" defaultValue={source?.url || ""} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sourceEnabled">Status</Label>
            <select
              id="sourceEnabled"
              name="enabled"
              defaultValue={source?.enabled ? "true" : "false"}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading || !source}>
              {loading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function GlobalSourceList() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [editTarget, setEditTarget] = useState<AdminSource | null>(null);

  const sourcesQuery = useQuery({
    queryKey: ["admin-sources"],
    queryFn: fetchSources,
    staleTime: 20_000,
  });

  const updateSourceMutation = useMutation({
    mutationFn: ({ sourceId, input }: { sourceId: string; input: { url?: string; name?: string; enabled: boolean } }) =>
      patchSource(sourceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sources"] });
      queryClient.invalidateQueries({ queryKey: ["admin-worker-status"] });
      toast.success("Source updated");
    },
    onError: (error) => {
      toast.error((error as Error).message);
    },
  });

  const forceFetchMutation = useMutation({
    mutationFn: (sourceId: string) => forceFetch(sourceId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-sources"] });
      queryClient.invalidateQueries({ queryKey: ["admin-worker-status"] });
      toast.success(`Fetched ${data?.fetchedCount ?? 0} items, inserted ${data?.insertedCount ?? 0}`);
    },
    onError: (error) => {
      toast.error((error as Error).message);
    },
  });

  const sources = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return sourcesQuery.data ?? [];
    }

    return (sourcesQuery.data ?? []).filter((source) => {
      const haystack = `${source.name} ${source.url} ${source.normalizedUrl} ${source.type}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, sourcesQuery.data]);

  useErrorToast(sourcesQuery.error, "Failed to load global sources");

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Global Sources</CardTitle>
          <Badge variant="outline">{sourcesQuery.data?.length ?? 0} total</Badge>
        </div>
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, url, type..."
            className="pl-9"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {sourcesQuery.isPending ? <TableSkeleton columns={7} /> : null}
        {sourcesQuery.isError ? (
          <p className="text-sm text-destructive">{(sourcesQuery.error as Error).message}</p>
        ) : null}

        {!sourcesQuery.isPending && !sourcesQuery.isError && !sources.length ? (
          <EmptyState title="No sources found" description="Try a different search query." />
        ) : null}

        {!sourcesQuery.isPending && !sourcesQuery.isError && sources.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Subscribers</TableHead>
                  <TableHead>Posts</TableHead>
                  <TableHead>Last Fetch</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((source) => (
                  <TableRow key={source.id}>
                    <TableCell className="min-w-64">
                      <p className="font-medium">{source.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{source.url}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{source.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={source.enabled ? "default" : "destructive"}>
                        {source.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>{source.subscriberCount}</TableCell>
                    <TableCell>{source.postCount}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {source.lastFetchedAt ? new Date(source.lastFetchedAt).toLocaleString() : "Never"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="icon-xs" variant="outline" onClick={() => setEditTarget(source)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="outline"
                          disabled={forceFetchMutation.isPending}
                          onClick={() => forceFetchMutation.mutate(source.id)}
                        >
                          <RefreshCw className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </CardContent>

      <EditSourceDialog
        source={editTarget}
        open={Boolean(editTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null);
          }
        }}
        loading={updateSourceMutation.isPending}
        onSubmit={(sourceId, input) => updateSourceMutation.mutateAsync({ sourceId, input })}
      />
    </Card>
  );
}

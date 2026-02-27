"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AddSourceDialog } from "@/components/sources/AddSourceDialog";
import { EditSubscriptionDialog } from "@/components/sources/EditSubscriptionDialog";
import { MuteSourceDialog } from "@/components/sources/MuteSourceDialog";
import { SourceList } from "@/components/sources/SourceList";
import { SourceListSkeleton, StatsCardsSkeleton } from "@/components/shared/LoadingStates";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useErrorToast, useSources } from "@/hooks";
import type { SourceSubscription } from "@/types/feed";

export function SourcesManager() {
  const sourcesQuery = useSources();
  const [query, setQuery] = useState("");
  const [editTarget, setEditTarget] = useState<SourceSubscription | null>(null);
  const [muteTarget, setMuteTarget] = useState<SourceSubscription | null>(null);

  const filteredSources = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return sourcesQuery.sources;
    }

    return sourcesQuery.sources.filter((subscription) => {
      const haystack = `${subscription.customName || ""} ${subscription.source.name} ${subscription.source.url} ${subscription.source.type}`
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, sourcesQuery.sources]);

  async function handleSubscribe(input: {
    type: "x" | "youtube" | "substack" | "telegram" | "website";
    url: string;
    name?: string;
  }) {
    await sourcesQuery.subscribe.mutateAsync(input);
    toast.success("Source subscribed");
  }

  async function handleEdit(input: { sourceId: string; customName?: string }) {
    try {
      await sourcesQuery.updateSubscription.mutateAsync({
        sourceId: input.sourceId,
        customName: input.customName,
      });
      toast.success("Subscription updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update subscription");
      throw error;
    }
  }

  async function handleMute(input: { sourceId: string; mutedUntil: string | null }) {
    try {
      await sourcesQuery.updateSubscription.mutateAsync({
        sourceId: input.sourceId,
        mutedUntil: input.mutedUntil,
      });
      toast.success(input.mutedUntil ? "Source muted" : "Source unmuted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update mute settings");
      throw error;
    }
  }

  async function handleUnsubscribe(subscription: SourceSubscription) {
    const confirmed = window.confirm(`Unsubscribe from ${subscription.customName || subscription.source.name}?`);
    if (!confirmed) {
      return;
    }

    try {
      await sourcesQuery.unsubscribe.mutateAsync(subscription.sourceId);
      toast.success("Unsubscribed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to unsubscribe");
    }
  }

  const busy =
    sourcesQuery.subscribe.isPending ||
    sourcesQuery.updateSubscription.isPending ||
    sourcesQuery.unsubscribe.isPending;

  useErrorToast(sourcesQuery.error, "Failed to load sources");

  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by source name, url, type..."
        />
        <AddSourceDialog onSubmit={handleSubscribe} loading={sourcesQuery.subscribe.isPending} />
      </div>

      {sourcesQuery.isPending ? (
        <StatsCardsSkeleton count={3} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardContent className="py-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Subscriptions</p>
              <p className="text-2xl font-semibold">{sourcesQuery.sources.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Muted</p>
              <p className="text-2xl font-semibold">
                {
                  sourcesQuery.sources.filter(
                    (item) => item.mutedUntil && new Date(item.mutedUntil) > new Date()
                  ).length
                }
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Unread total</p>
              <p className="text-2xl font-semibold">
                {sourcesQuery.sources.reduce((sum, item) => sum + item.unreadCount, 0)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {sourcesQuery.isError ? (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">
            {(sourcesQuery.error as Error).message}
          </CardContent>
        </Card>
      ) : null}

      {sourcesQuery.isPending ? (
        <SourceListSkeleton />
      ) : (
        <SourceList
          sources={filteredSources}
          busy={busy}
          onEdit={setEditTarget}
          onMute={setMuteTarget}
          onUnsubscribe={handleUnsubscribe}
        />
      )}

      <EditSubscriptionDialog
        open={Boolean(editTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null);
          }
        }}
        subscription={editTarget}
        loading={sourcesQuery.updateSubscription.isPending}
        onSubmit={handleEdit}
      />

      <MuteSourceDialog
        open={Boolean(muteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setMuteTarget(null);
          }
        }}
        subscription={muteTarget}
        loading={sourcesQuery.updateSubscription.isPending}
        onSubmit={handleMute}
      />
    </section>
  );
}

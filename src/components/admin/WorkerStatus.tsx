"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock3, Lock, RefreshCw } from "lucide-react";

import { StatsCardsSkeleton } from "@/components/shared/LoadingStates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useErrorToast } from "@/hooks";
import type { WorkerStatusResponse } from "@/types/admin";

async function fetchWorkerStatus() {
  const response = await fetch("/api/admin/worker-status", { cache: "no-store" });
  const payload = (await response.json()) as WorkerStatusResponse;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? "Failed to load worker status");
  }

  return payload.data;
}

export function WorkerStatus() {
  const workerQuery = useQuery({
    queryKey: ["admin-worker-status"],
    queryFn: fetchWorkerStatus,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const status = workerQuery.data;
  useErrorToast(workerQuery.error, "Failed to load worker status");

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Worker Status</CardTitle>
        <Button variant="outline" size="sm" onClick={() => workerQuery.refetch()} disabled={workerQuery.isFetching}>
          <RefreshCw className={`size-4 ${workerQuery.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {workerQuery.isPending ? <StatsCardsSkeleton /> : null}
        {workerQuery.isError ? (
          <p className="text-sm text-destructive">{(workerQuery.error as Error).message}</p>
        ) : null}

        {status ? (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <Card className="border-border/60 py-4">
                <CardContent className="space-y-1 px-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Worker lock</p>
                  <div className="inline-flex items-center gap-2">
                    <Lock className="size-4" />
                    <Badge variant={status.worker.lockActive ? "destructive" : "default"}>
                      {status.worker.lockActive ? "Active" : "Idle"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/60 py-4">
                <CardContent className="space-y-1 px-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Total sources</p>
                  <p className="text-2xl font-semibold">{status.sources.total}</p>
                </CardContent>
              </Card>
              <Card className="border-border/60 py-4">
                <CardContent className="space-y-1 px-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Stale sources</p>
                  <div className="inline-flex items-center gap-2">
                    <Clock3 className="size-4 text-muted-foreground" />
                    <p className="text-2xl font-semibold">{status.sources.stale}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/60 py-4">
                <CardContent className="space-y-1 px-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Failed sources</p>
                  <div className="inline-flex items-center gap-2">
                    <AlertTriangle className="size-4 text-destructive" />
                    <p className="text-2xl font-semibold">{status.sources.failed}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="rounded-lg border border-border/70 p-4 text-sm">
              <p className="font-medium">Latest fetched source</p>
              {status.sources.latestFetched ? (
                <p className="text-muted-foreground">
                  <CheckCircle2 className="mr-1 inline size-4 text-primary" />
                  {status.sources.latestFetched.name} ·{" "}
                  {new Date(status.sources.latestFetched.lastFetchedAt).toLocaleString()} ·{" "}
                  {status.sources.latestFetched.lastFetchStatus}
                </p>
              ) : (
                <p className="text-muted-foreground">No sources fetched yet.</p>
              )}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

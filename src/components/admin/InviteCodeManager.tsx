"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/LoadingStates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useErrorToast } from "@/hooks";
import type { InviteCodesResponse } from "@/types/admin";

type MutationResponse = {
  success: boolean;
  data: {
    id: string;
    code: string;
    createdBy: string;
    usedBy: string | null;
    usedAt: string | null;
    expiresAt: string | null;
    createdAt: string;
  };
  error?: string;
};

async function fetchInviteCodes() {
  const response = await fetch("/api/admin/invite-codes", { cache: "no-store" });
  const payload = (await response.json()) as InviteCodesResponse;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? "Failed to load invite codes");
  }

  return payload.data;
}

async function createInviteCode(input: { code?: string; expiresAt?: string }) {
  const payload = {
    ...(input.code ? { code: input.code } : {}),
    ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
  };

  const response = await fetch("/api/admin/invite-codes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = (await response.json()) as MutationResponse;
  if (!response.ok || !body.success) {
    throw new Error(body.error ?? "Failed to create invite code");
  }

  return body.data;
}

export function InviteCodeManager() {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const inviteCodesQuery = useQuery({
    queryKey: ["admin-invite-codes"],
    queryFn: fetchInviteCodes,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: createInviteCode,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-invite-codes"] });
      setCode("");
      setExpiresAt("");
      toast.success(`Invite code created: ${data.code}`);

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(data.code);
          toast.success("Invite code copied to clipboard");
        } catch {
          // Clipboard permission is optional.
        }
      }
    },
    onError: (error) => {
      toast.error((error as Error).message);
    },
  });

  useErrorToast(inviteCodesQuery.error, "Failed to load invite codes");

  const activeCount = useMemo(
    () => (inviteCodesQuery.data ?? []).filter((item) => item.isActive).length,
    [inviteCodesQuery.data]
  );

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    createMutation.mutate({
      code: code.trim() || undefined,
      expiresAt: expiresAt || undefined,
    });
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Invite Codes</CardTitle>
          <Badge variant="outline">{activeCount} active</Badge>
        </div>
        <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="inviteCodeInput">Custom code (optional)</Label>
            <Input
              id="inviteCodeInput"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Leave empty to auto-generate"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inviteCodeExpiry">Expires at (optional)</Label>
            <Input
              id="inviteCodeExpiry"
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </div>
          <Button type="submit" className="self-end" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create code"}
          </Button>
        </form>
      </CardHeader>

      <CardContent className="space-y-3">
        {inviteCodesQuery.isPending ? <TableSkeleton columns={6} /> : null}
        {inviteCodesQuery.isError ? (
          <p className="text-sm text-destructive">{(inviteCodesQuery.error as Error).message}</p>
        ) : null}

        {!inviteCodesQuery.isPending &&
        !inviteCodesQuery.isError &&
        (inviteCodesQuery.data?.length ?? 0) === 0 ? (
          <EmptyState title="No invite codes created" description="Create your first invite code for invite-only registration." />
        ) : null}

        {!inviteCodesQuery.isPending &&
        !inviteCodesQuery.isError &&
        (inviteCodesQuery.data?.length ?? 0) > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Used By</TableHead>
                  <TableHead>Used At</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(inviteCodesQuery.data ?? []).map((inviteCode) => (
                  <TableRow key={inviteCode.id}>
                    <TableCell className="font-mono text-xs">{inviteCode.code}</TableCell>
                    <TableCell>
                      {inviteCode.isActive ? (
                        <Badge>Active</Badge>
                      ) : inviteCode.isUsed ? (
                        <Badge variant="secondary">Used</Badge>
                      ) : (
                        <Badge variant="destructive">Expired</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {inviteCode.expiresAt ? new Date(inviteCode.expiresAt).toLocaleString() : "Never"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{inviteCode.usedBy ?? "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {inviteCode.usedAt ? new Date(inviteCode.usedAt).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(inviteCode.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

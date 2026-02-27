"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Shield } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/LoadingStates";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useErrorToast } from "@/hooks";
import type { AdminUsersResponse } from "@/types/admin";

type MutationResponse = {
  success: boolean;
  data: unknown;
  error?: string;
};

async function fetchUsers() {
  const response = await fetch("/api/admin/users", { cache: "no-store" });
  const payload = (await response.json()) as AdminUsersResponse;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? "Failed to load users");
  }

  return payload.data;
}

async function patchUserEnabled(userId: string, enabled: boolean) {
  const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  const payload = (await response.json()) as MutationResponse;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? "Failed to update user");
  }
}

export function UserList() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchUsers,
    staleTime: 20_000,
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, enabled }: { userId: string; enabled: boolean }) => patchUserEnabled(userId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User updated");
    },
    onError: (error) => {
      toast.error((error as Error).message);
    },
  });

  const users = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return usersQuery.data ?? [];
    }

    return (usersQuery.data ?? []).filter((user) => {
      const haystack = `${user.email} ${user.name || ""} ${user.role} ${user.plan}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, usersQuery.data]);

  useErrorToast(usersQuery.error, "Failed to load users");

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Users</CardTitle>
          <Badge variant="outline">{usersQuery.data?.length ?? 0} total</Badge>
        </div>
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by email, name, role..."
            className="pl-9"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {usersQuery.isPending ? <TableSkeleton columns={8} /> : null}
        {usersQuery.isError ? (
          <p className="text-sm text-destructive">{(usersQuery.error as Error).message}</p>
        ) : null}

        {!usersQuery.isPending && !usersQuery.isError && !users.length ? (
          <EmptyState title="No users found" description="Try a different search query." />
        ) : null}

        {!usersQuery.isPending && !usersQuery.isError && users.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Sources</TableHead>
                  <TableHead>Posts</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="min-w-52">
                      <div className="flex items-center gap-2">
                        {user.role === "admin" ? <Shield className="size-4 text-primary" /> : null}
                        <div>
                          <p className="font-medium">{user.name || "Unnamed user"}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.plan === "pro" ? "default" : "outline"}>{user.plan}</Badge>
                    </TableCell>
                    <TableCell>{user.sourceCount}</TableCell>
                    <TableCell>{user.postCount}</TableCell>
                    <TableCell>{user.scheduledCount}</TableCell>
                    <TableCell>
                      <Badge variant={user.enabled ? "default" : "destructive"}>
                        {user.enabled ? "Active" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={user.enabled}
                        disabled={updateUserMutation.isPending}
                        onCheckedChange={(checked) =>
                          updateUserMutation.mutate({
                            userId: user.id,
                            enabled: Boolean(checked),
                          })
                        }
                      />
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

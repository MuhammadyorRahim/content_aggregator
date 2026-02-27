"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlobalSourceList } from "@/components/admin/GlobalSourceList";
import { InviteCodeManager } from "@/components/admin/InviteCodeManager";
import { UserList } from "@/components/admin/UserList";
import { WorkerStatus } from "@/components/admin/WorkerStatus";

export function AdminDashboard() {
  return (
    <Tabs defaultValue="worker" className="space-y-4">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="worker">Worker</TabsTrigger>
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="sources">Sources</TabsTrigger>
        <TabsTrigger value="invites">Invites</TabsTrigger>
      </TabsList>

      <TabsContent value="worker">
        <WorkerStatus />
      </TabsContent>

      <TabsContent value="users">
        <UserList />
      </TabsContent>

      <TabsContent value="sources">
        <GlobalSourceList />
      </TabsContent>

      <TabsContent value="invites">
        <InviteCodeManager />
      </TabsContent>
    </Tabs>
  );
}

"use client";

import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { UpgradePrompt } from "@/components/billing/UpgradePrompt";
import { ScheduleDialog } from "@/components/schedule/ScheduleDialog";
import { ScheduleList } from "@/components/schedule/ScheduleList";
import { ScheduleListSkeleton } from "@/components/shared/LoadingStates";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth, useErrorToast, useSchedule } from "@/hooks";
import type { ScheduleEventItem } from "@/types/feed";

type ScheduleWorkspaceProps = {
  isPro: boolean;
};

export function ScheduleWorkspace({ isPro }: ScheduleWorkspaceProps) {
  const { user } = useAuth();
  const schedule = useSchedule({ enabled: isPro });
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ScheduleEventItem | null>(null);

  const busy =
    schedule.createSchedule.isPending ||
    schedule.updateSchedule.isPending ||
    schedule.deleteSchedule.isPending;

  const events = useMemo(
    () =>
      [...schedule.events].sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      ),
    [schedule.events]
  );
  const googleConnected = Boolean(user?.googleConnected);

  useErrorToast(schedule.error, "Failed to load schedule");

  if (!isPro) {
    return (
      <UpgradePrompt
        title="Schedule is available on Pro"
        description="Upgrade to create reminders and keep follow-up work organized."
      />
    );
  }

  async function handleCreate(input: { postId: string; title: string; scheduledAt: string }) {
    await schedule.createSchedule.mutateAsync(input);
    toast.success("Schedule event created");
  }

  async function handleUpdate(input: { id: string; scheduledAt: string }) {
    await schedule.updateSchedule.mutateAsync(input);
    toast.success("Schedule updated");
    setEditTarget(null);
  }

  async function handleDelete(event: ScheduleEventItem) {
    const confirmed = window.confirm(`Delete "${event.title}" from schedule?`);
    if (!confirmed) {
      return;
    }

    try {
      await schedule.deleteSchedule.mutateAsync(event.id);
      toast.success("Event deleted");
      if (editTarget?.id === event.id) {
        setEditTarget(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete event");
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          Plan review sessions and reminders for key posts.
        </div>
        <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
          <PlusCircle className="size-4" />
          New event
        </Button>
      </div>

      {schedule.isPending ? <ScheduleListSkeleton /> : null}

      {schedule.isError ? (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">
            {(schedule.error as Error)?.message || "Failed to load schedule"}
          </CardContent>
        </Card>
      ) : null}

      {!googleConnected ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="text-sm text-muted-foreground">
              Connect Google to sync schedule events to Google Calendar.
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/api/auth/signin/google?callbackUrl=/schedule">Connect Google</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!schedule.isPending && !schedule.isError ? (
        <ScheduleList events={events} busy={busy} onEdit={setEditTarget} onDelete={handleDelete} />
      ) : null}

      <ScheduleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        event={null}
        loading={schedule.createSchedule.isPending}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <ScheduleDialog
        open={Boolean(editTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null);
          }
        }}
        event={editTarget}
        loading={schedule.updateSchedule.isPending}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />
    </section>
  );
}

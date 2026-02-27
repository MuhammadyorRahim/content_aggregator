"use client";

import { CalendarRange } from "lucide-react";

import { ScheduleCard } from "@/components/schedule/ScheduleCard";
import { EmptyState } from "@/components/shared/EmptyState";
import type { ScheduleEventItem } from "@/types/feed";

type ScheduleListProps = {
  events: ScheduleEventItem[];
  busy?: boolean;
  onEdit: (event: ScheduleEventItem) => void;
  onDelete: (event: ScheduleEventItem) => void;
};

export function ScheduleList({ events, busy, onEdit, onDelete }: ScheduleListProps) {
  if (!events.length) {
    return (
      <EmptyState
        icon={CalendarRange}
        title="No schedule events"
        description="Create your first event to plan review time for important posts."
      />
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <ScheduleCard key={event.id} event={event} busy={busy} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}

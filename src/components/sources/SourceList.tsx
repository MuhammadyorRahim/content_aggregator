"use client";

import { RadioTower } from "lucide-react";

import { SourceCard } from "@/components/sources/SourceCard";
import { EmptyState } from "@/components/shared/EmptyState";
import type { SourceSubscription } from "@/types/feed";

type SourceListProps = {
  sources: SourceSubscription[];
  busy?: boolean;
  onEdit: (subscription: SourceSubscription) => void;
  onMute: (subscription: SourceSubscription) => void;
  onUnsubscribe: (subscription: SourceSubscription) => void;
};

export function SourceList({ sources, busy, onEdit, onMute, onUnsubscribe }: SourceListProps) {
  if (!sources.length) {
    return (
      <EmptyState
        icon={RadioTower}
        title="No sources yet"
        description="Add your first source to start building your personal feed."
      />
    );
  }

  return (
    <div className="space-y-3">
      {sources.map((subscription) => (
        <SourceCard
          key={subscription.id}
          subscription={subscription}
          busy={busy}
          onEdit={onEdit}
          onMute={onMute}
          onUnsubscribe={onUnsubscribe}
        />
      ))}
    </div>
  );
}

"use client";

import { DraftCard, type DraftData } from "./draft-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface DraftListProps {
  drafts: DraftData[];
  loading: boolean;
  onSend: (id: string) => void;
  onDismiss: (id: string) => void;
  onEdit: (draft: DraftData) => void;
}

export function DraftList({ drafts, loading, onSend, onDismiss, onEdit }: DraftListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-xl" />
        ))}
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <EmptyState
        icon={Mail}
        heading="No drafts to review"
        description="AI-generated outreach drafts will appear here for your review."
        action={{ label: "Set Up Outreach Schedule", href: "/settings/schedule" }}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {drafts.map((draft) => (
        <DraftCard
          key={draft.id}
          draft={draft}
          onSend={onSend}
          onDismiss={onDismiss}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}

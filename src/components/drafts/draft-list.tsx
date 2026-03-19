"use client";

import { DraftCard, type DraftData } from "./draft-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail } from "lucide-react";

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
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium">No drafts to review</h3>
        <p className="text-sm text-muted-foreground mt-1">
          AI-generated outreach drafts will appear here for your review.
        </p>
      </div>
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

"use client";

import { useRealtimeRun } from "@trigger.dev/react-hooks";
import type { syncGranolaMeetings } from "@/trigger/sync-granola-meetings";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface ProcessingStatusProps {
  runId: string;
  publicToken: string;
  baseURL?: string;
  onComplete: () => void;
}

export function ProcessingStatus({
  runId,
  publicToken,
  baseURL,
  onComplete,
}: ProcessingStatusProps) {
  const { run, error } = useRealtimeRun<typeof syncGranolaMeetings>(runId, {
    accessToken: publicToken,
    baseURL,
    onComplete: () => {
      // Auto-refresh contacts after processing completes
      setTimeout(onComplete, 500);
    },
  });

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span>Processing error: {error.message}</span>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Starting...</span>
      </div>
    );
  }

  const progress = run.metadata?.progress as {
    phase?: string;
    total?: number;
    processed?: number;
    latestMeeting?: string;
    contactsCreated?: number;
    contactsUpdated?: number;
    meetingsSynced?: number;
  } | undefined;

  if (run.status === "COMPLETED") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-green-500/50 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4" />
        <span>
          Done! {progress?.meetingsSynced ?? 0} meetings synced,{" "}
          {progress?.contactsCreated ?? 0} new contacts
          {(progress?.contactsUpdated ?? 0) > 0 &&
            `, ${progress?.contactsUpdated} updated`}
        </span>
      </div>
    );
  }

  if (run.status === "FAILED") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span>Processing failed. Check Trigger.dev dashboard for details.</span>
      </div>
    );
  }

  // EXECUTING
  const statusText = progress?.phase === "sync"
    ? `Syncing meeting ${progress.processed ?? 0} of ${progress.total ?? "?"}${
        progress.latestMeeting ? ` — ${progress.latestMeeting}` : ""
      }`
    : "Processing meetings...";

  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{statusText}</span>
      {progress?.contactsCreated !== undefined && progress.contactsCreated > 0 && (
        <span className="text-green-600 dark:text-green-400">
          (+{progress.contactsCreated} contacts)
        </span>
      )}
    </div>
  );
}

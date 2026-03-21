"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface RunStatus {
  status: string;
  output?: {
    meetingsSynced?: number;
    contactsCreated?: number;
    contactsUpdated?: number;
  };
  metadata?: {
    progress?: {
      phase?: string;
      total?: number;
      processed?: number;
      latestMeeting?: string;
      contactsCreated?: number;
      contactsUpdated?: number;
      meetingsSynced?: number;
    };
  };
}

interface ProcessingStatusProps {
  runId: string;
  onComplete: () => void;
}

export function ProcessingStatus({ runId, onComplete }: ProcessingStatusProps) {
  const [status, setStatus] = useState<RunStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/meetings/process?runId=${runId}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || `HTTP ${res.status}`);
        return true; // stop polling
      }
      const data: RunStatus = await res.json();
      setStatus(data);

      if (data.status === "COMPLETED") {
        setDone(true);
        setTimeout(onComplete, 1000);
        return true;
      }
      if (data.status === "FAILED" || data.status === "CANCELED") {
        setDone(true);
        return true;
      }
      return false; // keep polling
    } catch {
      setError("Failed to check status");
      return true;
    }
  }, [runId, onComplete]);

  useEffect(() => {
    let stopped = false;
    const interval = setInterval(async () => {
      if (stopped) return;
      const shouldStop = await poll();
      if (shouldStop) {
        stopped = true;
        clearInterval(interval);
      }
    }, 3000);

    // Poll immediately on mount
    poll();

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [poll]);

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span>Processing error: {error}</span>
      </div>
    );
  }

  const progress = status?.metadata?.progress;

  if (status?.status === "COMPLETED") {
    const output = status.output;
    return (
      <div className="flex items-center gap-2 rounded-md border border-green-500/50 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4" />
        <span>
          Done! {output?.meetingsSynced ?? progress?.meetingsSynced ?? 0} meetings synced,{" "}
          {output?.contactsCreated ?? progress?.contactsCreated ?? 0} new contacts
          {(output?.contactsUpdated ?? progress?.contactsUpdated ?? 0) > 0 &&
            `, ${output?.contactsUpdated ?? progress?.contactsUpdated} updated`}
        </span>
      </div>
    );
  }

  if (status?.status === "FAILED") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span>Processing failed. Check Trigger.dev dashboard for details.</span>
      </div>
    );
  }

  // EXECUTING or waiting
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

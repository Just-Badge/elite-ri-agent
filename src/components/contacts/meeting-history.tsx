"use client";

import { format } from "date-fns";
import { ExternalLink } from "lucide-react";

interface MeetingHistoryProps {
  meetings: Array<{
    id: string;
    title?: string | null;
    meeting_date?: string | null;
    summary?: string | null;
    granola_url?: string | null;
  }>;
}

export function MeetingHistory({ meetings }: MeetingHistoryProps) {
  if (meetings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No meetings yet</p>
    );
  }

  // Sort by meeting_date descending (most recent first)
  const sorted = [...meetings].sort((a, b) => {
    if (!a.meeting_date) return 1;
    if (!b.meeting_date) return -1;
    return new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime();
  });

  return (
    <div className="space-y-4">
      {sorted.map((meeting) => (
        <div key={meeting.id} className="border-b pb-4 last:border-b-0">
          <div className="flex items-center justify-between">
            <div>
              {meeting.meeting_date && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(meeting.meeting_date), "MMM d, yyyy")}
                </p>
              )}
              {meeting.title && (
                <p className="font-semibold">{meeting.title}</p>
              )}
            </div>
            {meeting.granola_url && (
              <a
                href={meeting.granola_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
          {meeting.summary && (
            <p className="mt-1 text-sm text-muted-foreground">
              {meeting.summary}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

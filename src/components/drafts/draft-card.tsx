"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SYNC_STATUS_STYLES } from "@/lib/constants/status-styles";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Send, Pencil, Trash2 } from "lucide-react";

export interface DraftData {
  id: string;
  subject: string;
  body: string;
  status: string;
  gmail_sync_status?: string | null;
  ai_rationale?: string | null;
  created_at?: string | null;
  contacts?: { name: string; email: string } | null;
}

interface DraftCardProps {
  draft: DraftData;
  onSend: (id: string) => void;
  onDismiss: (id: string) => void;
  onEdit: (draft: DraftData) => void;
}

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  sent: "default",
  dismissed: "secondary",
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

export function DraftCard({ draft, onSend, onDismiss, onEdit }: DraftCardProps) {
  const syncInfo = SYNC_STATUS_STYLES[draft.gmail_sync_status ?? ""] ?? {
    dot: "bg-gray-400",
    label: draft.gmail_sync_status ?? "Unknown",
    description: "Sync status unknown",
  };

  const bodyPreview = stripHtml(draft.body).slice(0, 200);
  const isPending = draft.status === "pending_review";

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate">
              {draft.contacts?.name ?? "Unknown Contact"}
            </CardTitle>
            {draft.contacts?.email && (
              <CardDescription>{draft.contacts.email}</CardDescription>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-help">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${syncInfo.dot}`}
                  aria-label={`Gmail sync: ${syncInfo.label}`}
                />
                <span>{syncInfo.label}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {syncInfo.description}
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-sm font-medium mt-1">{draft.subject}</p>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {bodyPreview}
        </p>

        {draft.ai_rationale && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">AI rationale</summary>
            <p className="mt-1">{draft.ai_rationale}</p>
          </details>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {draft.created_at && (
            <span>
              Generated{" "}
              {formatDistanceToNow(new Date(draft.created_at), {
                addSuffix: true,
              })}
            </span>
          )}
        </div>

        {isPending ? (
          <div className="flex items-center gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => onSend(draft.id)}
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              Send
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(draft)}
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => onDismiss(draft.id)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Dismiss
            </Button>
          </div>
        ) : (
          <div className="pt-2">
            <Badge variant={STATUS_BADGE_VARIANT[draft.status] ?? "outline"}>
              {draft.status.replace("_", " ")}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

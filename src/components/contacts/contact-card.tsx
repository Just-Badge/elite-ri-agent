"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_COLORS, RISK_BORDER } from "@/lib/constants/status-styles";
import { Mail, Building2 } from "lucide-react";

interface ContactCardProps {
  contact: {
    id: string;
    name: string;
    email?: string | null;
    company?: string | null;
    role?: string | null;
    category?: string | null;
    last_interaction_at?: string | null;
    status?: string | null;
    action_items?: { id: string; completed: boolean }[];
    days_overdue?: number;
    risk_level?: "critical" | "warning" | "healthy" | "unknown";
    needs_triage?: boolean;
  };
}

export function ContactCard({ contact }: ContactCardProps) {
  const incompleteItems =
    contact.action_items?.filter((item) => !item.completed) ?? [];
  const statusColor = STATUS_COLORS[contact.status ?? "active"] ?? "bg-gray-400";
  const riskBorder = contact.risk_level ? RISK_BORDER[contact.risk_level] : undefined;

  return (
    <Link href={`/contacts/${contact.id}`} className="block">
      <Card className={cn("transition-shadow hover:shadow-md cursor-pointer h-full", riskBorder)} aria-label={contact.risk_level && contact.risk_level !== "healthy" ? `${contact.name} - ${contact.risk_level} risk` : contact.name}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${statusColor}`}
              aria-label={`Status: ${contact.status ?? "active"}`}
            />
            <CardTitle>{contact.name}</CardTitle>
            {contact.needs_triage && (
              <Badge variant="outline" className="text-xs">
                Needs review
              </Badge>
            )}
          </div>
          {(contact.company || contact.role) && (
            <CardDescription>
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" aria-hidden="true" />
                {[contact.company, contact.role].filter(Boolean).join(" - ")}
              </span>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {contact.email && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Mail className="h-3 w-3" aria-hidden="true" />
              {contact.email}
            </div>
          )}
          {contact.category && (
            <Badge variant="secondary">{contact.category}</Badge>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {incompleteItems.length > 0 && (
              <span>
                {incompleteItems.length} action item
                {incompleteItems.length !== 1 ? "s" : ""}
              </span>
            )}
            <span className="flex items-center gap-1">
              {contact.last_interaction_at && (
                <span>
                  {formatDistanceToNow(new Date(contact.last_interaction_at), {
                    addSuffix: true,
                  })}
                </span>
              )}
              {contact.days_overdue != null && contact.days_overdue > 0 && (
                <span
                  className={cn(
                    "font-medium",
                    contact.risk_level === "critical"
                      ? "text-red-500"
                      : "text-amber-500"
                  )}
                >
                  {contact.days_overdue}d overdue
                </span>
              )}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

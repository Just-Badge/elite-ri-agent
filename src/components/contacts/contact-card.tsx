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
  };
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500",
  dormant: "bg-gray-400",
  not_pursuing: "bg-red-500",
};

export function ContactCard({ contact }: ContactCardProps) {
  const incompleteItems =
    contact.action_items?.filter((item) => !item.completed) ?? [];
  const statusColor = STATUS_COLORS[contact.status ?? "active"] ?? "bg-gray-400";

  return (
    <Link href={`/contacts/${contact.id}`} className="block">
      <Card className="transition-shadow hover:shadow-md cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${statusColor}`}
              aria-label={`Status: ${contact.status ?? "active"}`}
            />
            <CardTitle>{contact.name}</CardTitle>
          </div>
          {(contact.company || contact.role) && (
            <CardDescription>
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {[contact.company, contact.role].filter(Boolean).join(" - ")}
              </span>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {contact.email && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Mail className="h-3 w-3" />
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
            {contact.last_interaction_at && (
              <span>
                {formatDistanceToNow(new Date(contact.last_interaction_at), {
                  addSuffix: true,
                })}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface PendingAction {
  id: string;
  text: string;
  contact_id: string;
  contacts: { name: string };
}

interface PendingActionsProps {
  actions: PendingAction[];
}

const MAX_DISPLAY = 8;

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
}

export function PendingActions({ actions }: PendingActionsProps) {
  const displayed = actions.slice(0, MAX_DISPLAY);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Pending Actions</CardTitle>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <EmptyState
            compact
            icon={CheckCircle}
            heading="No pending actions"
            description="All action items are complete"
          />
        ) : (
          <div className="space-y-3">
            {displayed.map((action) => (
              <Link
                key={action.id}
                href={`/contacts/${action.contact_id}`}
                className="block rounded-md px-2 py-1.5 hover:bg-muted transition-colors"
              >
                <p className="text-sm">{truncate(action.text, 80)}</p>
                <p className="text-xs text-muted-foreground">
                  {action.contacts.name}
                </p>
              </Link>
            ))}
            {actions.length > MAX_DISPLAY && (
              <Link
                href="/contacts"
                className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors pt-1"
              >
                View all {actions.length} actions
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
